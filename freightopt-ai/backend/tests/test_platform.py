import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.catalog import VESSEL_BY_NAME, PORT_BY_NAME
from app.services.optimization import check_port_compatibility


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def voyage():
    return dict(
        cargo_type="Coking Coal",
        cargo_quantity=70000,
        origin_country="Australia",
        origin_port="Newcastle",
        destination_port="Gangavaram",
        start_date="2026-09-20",
        contract_type="Short-Term",
        contract_duration_days=45,
    )


def test_incompatible_draft():
    result = check_port_compatibility(
        VESSEL_BY_NAME["Capesize"], PORT_BY_NAME["Haldia"]
    )
    assert not result["compatible"]
    assert len([c for c in result["checks"] if not c["passed"]]) == 3
    assert any("9.7m" in reason for reason in result["reasons"])


def test_compatible_boundary():
    port = {
        **PORT_BY_NAME["Gangavaram"],
        "max_draft": 14.5,
        "max_loa": 225,
        "max_beam": 32.3,
    }
    assert check_port_compatibility(VESSEL_BY_NAME["Panamax"], port)["compatible"]


def test_vessel_recommendation(client, voyage):
    r = client.post("/api/vessel/recommend", json=voyage)
    assert r.status_code == 200
    rows = r.json()
    assert rows[0]["vessel"] == "Panamax"
    assert rows[0]["compatible"]
    assert not next(v for v in rows if v["vessel"] == "Handysize")["compatible"]


def test_forecast(client, voyage):
    r = client.post("/api/forecast", json=voyage)
    assert r.status_code == 200
    data = r.json()
    assert len(data["points"]) == 91
    assert set(data["horizons"]) == {"7", "30", "60", "90"}
    for p in data["points"]:
        assert 0 <= p["lower_bound"] <= p["predicted_rate"] <= p["upper_bound"]
    assert len({p["predicted_rate"] for p in data["points"]}) > 20


def test_optimization_costs_and_constraints(client, voyage):
    r = client.post("/api/optimize", json=voyage)
    assert r.status_code == 200
    data = r.json()
    assert data["feasible"]
    assert data["id"] > 0
    vessel = next(
        v
        for v in data["vessel_comparison"]
        if v["vessel"] == data["recommended_vessel"]
    )
    assert vessel["compatible"] and all(
        c["compatible"] for c in vessel["compatibility"]
    )
    costs = data["optimized_cost"]
    assert costs["total"] == pytest.approx(
        sum(
            costs[k]
            for k in [
                "freight_cost",
                "port_charges",
                "waiting_cost",
                "idle_cost",
                "commitment_cost",
            ]
        ),
        abs=0.02,
    )
    assert data["potential_saving"] == pytest.approx(
        data["spot_cost"]["total"] - costs["total"], abs=0.02
    )
    assert sum(x["value"] for x in data["score_breakdown"]) == data["opportunity_score"]
    assert data["estimated_total_cost"] == costs["total"]


def test_infeasible_does_not_recommend(client, voyage):
    r = client.post("/api/optimize", json={**voyage, "destination_port": "Haldia"})
    assert r.status_code == 200
    data = r.json()
    assert not data["feasible"]
    assert data["recommended_vessel"] is None
    assert data["estimated_total_cost"] is None
    assert data["alternatives"]
    assert not any(v["compatible"] for v in data["vessel_comparison"])


@pytest.mark.parametrize(
    "change",
    [
        {"cargo_quantity": -1},
        {"cargo_quantity": 200000},
        {"origin_country": "Russia"},
        {"origin_port": "Unknown"},
        {"destination_port": "Newcastle"},
        {"cargo_type": "Unknown"},
        {"start_date": "2020-01-01"},
        {"start_date": "2028-01-01"},
        {"contract_type": "Invalid"},
        {"contract_duration_days": 0},
        {"unexpected": "field"},
    ],
)
def test_invalid_input(client, voyage, change):
    assert client.post("/api/optimize", json={**voyage, **change}).status_code == 422


def test_unknown_port(client):
    assert client.get("/api/ports/Unknown").status_code == 404


def test_simulation_changes_results(client, voyage):
    a = client.post(
        "/api/simulate",
        json={
            **voyage,
            "fuel_price_usd": 500,
            "baltic_index": 1400,
            "destination_congestion": 20,
        },
    ).json()
    b = client.post(
        "/api/simulate",
        json={
            **voyage,
            "fuel_price_usd": 1000,
            "baltic_index": 2600,
            "destination_congestion": 90,
            "weather": "cyclone risk",
        },
    ).json()
    assert b["estimated_total_cost"] > a["estimated_total_cost"]
    assert b["timing"]["total_days"] > a["timing"]["total_days"]
    assert b["recommendation"] == "HIGH-RISK MARKET"


def test_metrics_chronological(client):
    m = client.get("/api/model/metrics").json()
    assert m["train_end"] < m["test_start"]
    assert len(m["models"]) == 3
    assert (
        m["training_records"] + m["validation_records"] + m["testing_records"] >= 5000
    )
    assert m["metrics"]["rmse"] > 0


def test_catalog_and_dashboard(client):
    assert len(client.get("/api/ports").json()) == 21
    assert len(client.get("/api/routes?all_routes=true").json()) == 98
    r = client.get("/api/dashboard")
    assert r.status_code == 200
    assert r.json()["decision"]["feasible"]
    assert all(a["source"] == "Simulation" for a in client.get("/api/alerts").json())


def test_feature_lags_do_not_read_future():
    import pandas as pd
    from app.ml.features import engineer

    data = pd.DataFrame(
        {
            "date": pd.date_range("2026-01-01", periods=10),
            "baltic_index": range(100, 110),
            "fuel_price_usd": range(500, 510),
        }
    )
    before = engineer(data, data)
    modified = data.copy()
    modified.loc[8:, "baltic_index"] = 9000
    after = engineer(modified, modified)
    assert before.loc[8, "baltic_lag_1"] == after.loc[8, "baltic_lag_1"] == 107
    assert before.loc[8, "baltic_rolling_7"] == after.loc[8, "baltic_rolling_7"]


def test_uncertainty_matches_final_booking(client, voyage):
    result = client.post("/api/optimize", json=voyage).json()
    point = next(
        p for p in result["forecast"] if p["date"] == result["recommended_booking_date"]
    )
    spread = (point["upper_bound"] - point["lower_bound"]) / (
        2 * point["predicted_rate"]
    )
    risk = next(
        r for r in result["risk_factors"] if r["name"] == "Forecast Uncertainty"
    )
    assert risk["score"] == round(min(100, spread * 220))
    assert result["vessel_comparison"][0]["vessel"] == result["recommended_vessel"]


def test_bundled_model_needs_no_training(monkeypatch):
    from app.ml import train as training
    def forbidden():
        pytest.fail("Web startup must use the bundled model, not train")
    monkeypatch.setattr(training, "train", forbidden)
    monkeypatch.setenv("RENDER", "true")
    with TestClient(app) as c:
        assert c.get("/api/health").json()["model_ready"]


def test_dashboard_reuses_results(client, monkeypatch):
    from app.api import routes
    routes.build_dashboard.cache_clear()
    first = client.get("/api/dashboard")
    assert first.status_code == 200
    def forbidden(*args, **kwargs):
        pytest.fail("Repeated dashboard reads should not recompute optimizations")
    monkeypatch.setattr(routes, "optimize", forbidden)
    second = client.get("/api/dashboard")
    assert second.status_code == 200
    assert second.json() == first.json()
    routes.build_dashboard.cache_clear()
