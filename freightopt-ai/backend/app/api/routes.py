from datetime import date
from functools import lru_cache
import pandas as pd
from fastapi import APIRouter, Request, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from app.config import DATA, DEMO_DATE, USD_INR, DISCLAIMER, PORT_DISCLAIMER
from app.schemas.domain import (
    VoyageRequest,
    SimulationRequest,
    CompatibilityRequest,
    CompatibilityResult,
    ForecastResponse,
    OptimizationResponse,
    VesselEvaluation,
    Alert,
)
from app.schemas.views import (
    ConfigResponse,
    VesselResponse,
    RouteIntelligence,
    RouteDistance,
    HistoryPoint,
    MarketResponse,
    MetricsResponse,
)
from app.services.catalog import (
    PORTS,
    PORT_BY_NAME,
    VESSELS,
    VESSEL_BY_NAME,
    CARGOS,
    ORIGINS,
    ROUTES,
    market_state,
)
from app.services.optimization import (
    optimize,
    recommend_vessel,
    check_port_compatibility,
    risk_label,
)
from app.services.providers import DATA_SOURCES
from app.database.session import SessionLocal
from app.models.entities import (
    OptimizationRun,
    Forecast,
    AlertRecord,
    Port,
    Route,
    Vessel,
)

router = APIRouter()


class HealthResponse(BaseModel):
    status: str
    model_ready: bool
    demo: bool
    as_of: str


class PortResponse(BaseModel):
    name: str
    country: str
    latitude: float
    longitude: float
    max_draft: float
    max_loa: float
    max_beam: float
    handling_rate: float
    average_turnaround_days: float
    average_waiting_days: float
    congestion_index: float
    port_charges_usd: float
    data_source: str


class DashboardResponse(BaseModel):
    as_of: str
    market: dict
    kpis: dict
    decision: OptimizationResponse
    forecast: ForecastResponse
    vessel_rates: list[dict]
    congestion: list[dict]
    route_comparison: list[dict]
    data_sources: list[dict]
    disclaimer: str
    port_disclaimer: str
    currency: dict


@router.get("/health", response_model=HealthResponse)
def health(request: Request):
    return dict(
        status="ok",
        model_ready=hasattr(request.app.state, "forecaster"),
        demo=True,
        as_of=DEMO_DATE,
    )


@router.get("/config", response_model=ConfigResponse)
def config():
    return dict(
        as_of=DEMO_DATE,
        cargos=CARGOS,
        countries=list(dict.fromkeys(p["country"] for p in ORIGINS)),
        usd_inr=USD_INR,
        disclaimer=DISCLAIMER,
        port_disclaimer=PORT_DISCLAIMER,
        data_sources=DATA_SOURCES,
    )


@router.get("/ports", response_model=list[PortResponse])
def ports(country: str | None = None):
    with SessionLocal() as db:
        rows = [p.details for p in db.scalars(select(Port))]
    return [p for p in rows if country is None or p["country"] == country]


@router.get("/ports/{port}", response_model=PortResponse)
def port_detail(port: str):
    with SessionLocal() as db:
        row = db.scalar(select(Port).where(Port.name == port))
    if row is None:
        raise HTTPException(404, "Port not found")
    return row.details


@router.get("/vessels", response_model=list[VesselResponse])
def vessels():
    with SessionLocal() as db:
        return [r.details for r in db.scalars(select(Vessel))]


@router.post("/port/check-compatibility", response_model=CompatibilityResult)
def compatibility(payload: CompatibilityRequest):
    if payload.port_name not in PORT_BY_NAME:
        raise HTTPException(404, "Port not found")
    return check_port_compatibility(
        VESSEL_BY_NAME[payload.vessel_type], PORT_BY_NAME[payload.port_name]
    )


@router.post("/vessel/recommend", response_model=list[VesselEvaluation])
def vessel_recommend(payload: VoyageRequest, request: Request):
    return recommend_vessel(payload, request.app.state.forecaster, payload.start_date)


@router.post("/forecast", response_model=ForecastResponse)
def forecast(payload: VoyageRequest, request: Request):
    forecaster = request.app.state.forecaster
    ranking = recommend_vessel(payload, forecaster)
    best = next((v for v in ranking if v["compatible"]), None)
    if best is None:
        raise HTTPException(
            422, "No compatible vessel for forecast. Change port or cargo quantity."
        )
    result = forecaster.forecast(payload, best["vessel"])
    with SessionLocal.begin() as db:
        db.add(Forecast(request=payload.model_dump(mode="json"), result=result))
    return result


@router.post("/optimize", response_model=OptimizationResponse)
def optimization(payload: VoyageRequest, request: Request):
    result = optimize(payload, request.app.state.forecaster)
    with SessionLocal.begin() as db:
        run = OptimizationRun(request=payload.model_dump(mode="json"), result=result)
        db.add(run)
        db.flush()
        result["id"] = run.id
    return result


@router.post("/simulate", response_model=OptimizationResponse)
def simulation(payload: SimulationRequest, request: Request):
    values = payload.model_dump()
    override = {
        k: values.pop(k)
        for k in ["fuel_price_usd", "baltic_index", "destination_congestion", "weather"]
    }
    return optimize(VoyageRequest(**values), request.app.state.forecaster, override)


@router.get("/model/metrics", response_model=MetricsResponse)
def model_metrics(request: Request):
    return request.app.state.forecaster.metrics


@lru_cache(maxsize=1)
def history_records():
    df = pd.read_csv(DATA / "freight_history.csv")
    daily = (
        df.groupby("date")
        .agg(
            rate=("freight_rate_usd_per_tonne", "mean"),
            baltic_index=("baltic_index", "mean"),
            fuel_price=("fuel_price_usd", "mean"),
        )
        .reset_index()
    )
    return daily.round(3).to_dict(orient="records")


@router.get("/market/history", response_model=list[HistoryPoint])
def history(days: int = Query(default=180, ge=7, le=1461)):
    return history_records()[-days:]


@router.get("/market/forecast", response_model=ForecastResponse)
def market_forecast(request: Request):
    return request.app.state.forecaster.forecast(VoyageRequest())


@lru_cache(maxsize=2)
def build_route_rows(forecaster):
    results = []
    for origin, dest in [
        ("Newcastle", "Gangavaram"),
        ("Newcastle", "Paradip"),
        ("Hay Point", "Dhamra"),
        ("Nacala", "Visakhapatnam"),
        ("Taboneo", "Paradip"),
        ("Baltimore", "Haldia"),
    ]:
        p = VoyageRequest(
            origin_port=origin,
            origin_country=PORT_BY_NAME[origin]["country"],
            destination_port=dest,
        )
        r = optimize(p, forecaster, include_alternatives=False)
        route = next(
            x
            for x in ROUTES
            if x["origin_port"] == origin and x["destination_port"] == dest
        )
        results.append(
            dict(
                **route,
                current_rate=r["forecast"][0]["predicted_rate"]
                if r["forecast"]
                else None,
                forecast_30=r["forecast"][30]["predicted_rate"]
                if r["forecast"]
                else None,
                recommended_vessel=r["recommended_vessel"],
                congestion=PORT_BY_NAME[dest]["congestion_index"],
                opportunity_score=r["opportunity_score"],
                estimated_cost=r["estimated_total_cost"],
                feasible=r["feasible"],
            )
        )
    return results


@router.get("/routes", response_model=list[RouteIntelligence] | list[RouteDistance])
def routes(request: Request, all_routes: bool = False):
    if all_routes:
        with SessionLocal() as db:
            return [r.details for r in db.scalars(select(Route))]
    return build_route_rows(request.app.state.forecaster)


@lru_cache(maxsize=2)
def market_overview(forecaster):
    p = VoyageRequest()
    f = forecaster.forecast(p)
    m = market_state(date.fromisoformat(DEMO_DATE))
    change = (f["horizons"]["30"]["predicted_rate"] / f["current_rate"] - 1) * 100
    current = forecaster.predict_many(
        p, [v["name"] for v in VESSELS], [date.fromisoformat(DEMO_DATE)]
    )
    previous = market_state(
        date.fromisoformat(DEMO_DATE) - __import__("datetime").timedelta(days=7)
    )
    return dict(
        **m,
        index_change_percent=round(
            (m["baltic_index"] / previous["baltic_index"] - 1) * 100, 2
        ),
        status="BULLISH" if change > 2 else "BEARISH" if change < -2 else "NEUTRAL",
        directional_change=round(change, 2),
        forecast=f,
        vessel_rates=[
            dict(
                vessel=v["name"],
                rate=current[v["name"]][0]["predicted_rate"],
                utilization=round(
                    p.cargo_quantity / v["cargo_capacity_tonnes"] * 100, 1
                ),
                capacity=v["cargo_capacity_tonnes"],
                feasible_capacity=p.cargo_quantity <= v["cargo_capacity_tonnes"],
            )
            for v in VESSELS
        ],
        note="Reference quote: 70,000t Coking Coal, Newcastle → Gangavaram. Vessel quotes are conditional model estimates; undersized vessels cannot carry this lot.",
    )


@router.get("/market/overview", response_model=MarketResponse)
def overview(request: Request):
    return market_overview(request.app.state.forecaster)


@router.get("/alerts", response_model=list[Alert])
def alerts(request: Request):
    m = market_overview(request.app.state.forecaster)
    rows = [
        dict(
            id=f"congestion-{p['name']}",
            title=f"High congestion at {p['name']}",
            detail=f"Representative congestion {p['congestion_index']}/100; baseline waiting {p['average_waiting_days']} days.",
            severity=risk_label(p["congestion_index"]),
            source="Simulation",
        )
        for p in PORTS
        if p["country"] == "India" and p["congestion_index"] >= 60
    ]
    rows.append(
        dict(
            id="constraint",
            title="Capesize violates Haldia draft constraints",
            detail="Representative laden draft 18.2m exceeds the 8.5m demo limit by 9.7m. No Capesize recommendation is permitted.",
            severity="CRITICAL",
            source="Simulation",
        )
    )
    change = m["directional_change"]
    rows.append(
        dict(
            id="market-trend",
            title=f"Freight scenario {'rises' if change >= 0 else 'falls'} {abs(change):.1f}% over 30 days",
            detail="Newcastle → Gangavaram / Panamax / 70,000t reference. Model scenario, not a live market alert.",
            severity="MEDIUM",
            source="Simulation",
        )
    )
    with SessionLocal() as db:
        rows.extend([r.details for r in db.scalars(select(AlertRecord))])
    return rows


@router.get("/dashboard", response_model=DashboardResponse)
def dashboard(request: Request):
    forecaster = request.app.state.forecaster
    m = market_overview(forecaster)
    decision = optimize(VoyageRequest(), forecaster, include_alternatives=False)
    return dict(
        as_of=DEMO_DATE,
        market=m,
        kpis=dict(
            current_rate=m["forecast"]["current_rate"],
            forecast_30=m["forecast"]["horizons"]["30"]["predicted_rate"],
            average_freight=round(
                sum(r["rate"] for r in history_records()[-30:]) / 30, 2
            ),
            market_index=m["baltic_index"],
            volatility=m["market_volatility"],
            port_alerts=sum(
                p["congestion_index"] >= 60 for p in PORTS if p["country"] == "India"
            ),
            potential_saving=decision["potential_saving"],
            opportunity_score=decision["opportunity_score"],
        ),
        decision=decision,
        forecast=m["forecast"],
        vessel_rates=m["vessel_rates"],
        congestion=[
            dict(port=p["name"], congestion=p["congestion_index"])
            for p in PORTS
            if p["country"] == "India"
        ],
        route_comparison=build_route_rows(forecaster),
        data_sources=DATA_SOURCES,
        disclaimer=DISCLAIMER,
        port_disclaimer=PORT_DISCLAIMER,
        currency={"usd_inr": USD_INR},
    )
