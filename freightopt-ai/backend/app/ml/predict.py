from datetime import date, timedelta
import json
import joblib
import numpy as np
import pandas as pd
from app.config import ARTIFACTS, DEMO_DATE
from app.ml.features import engineer, FEATURES
from app.services.catalog import PORT_BY_NAME, ROUTE_MAP
from app.services.providers import DemoMarketProvider, MarketProvider


class ForecastService:
    def __init__(self, provider: MarketProvider | None = None):
        self.provider = provider or DemoMarketProvider()
        self.pipeline = joblib.load(ARTIFACTS / "model.joblib")
        self.metrics = json.loads((ARTIFACTS / "metrics.json").read_text())
        self.as_of = date.fromisoformat(DEMO_DATE)

    def predict_many(self, request, vessels, days, overrides=None):
        overrides = overrides or {}
        origin = PORT_BY_NAME[request.origin_port]
        dest = PORT_BY_NAME[request.destination_port]
        first = min(min(days), self.as_of) - timedelta(days=35)
        last = max(days)
        market = []
        for d in pd.date_range(first, last):
            m = self.provider.snapshot(d.date())
            if d.date() >= self.as_of:
                # Shock remains a relative shift on the simulated scenario path.
                base = self.provider.snapshot(self.as_of)
                for key in ["fuel_price_usd", "baltic_index"]:
                    if key in overrides:
                        m[key] *= overrides[key] / base[key]
            market.append(dict(date=d.date(), **m))
        market_lookup = {r["date"]: r for r in market}
        rows = []
        for vessel in vessels:
            for day in days:
                m = market_lookup[day]
                rows.append(
                    dict(
                        date=day,
                        origin_country=request.origin_country,
                        origin_port=request.origin_port,
                        destination_port=request.destination_port,
                        cargo_type=request.cargo_type,
                        cargo_quantity_tonnes=request.cargo_quantity,
                        vessel_type=vessel,
                        distance_nm=ROUTE_MAP[
                            request.origin_port, request.destination_port
                        ]["distance_nm"],
                        port_congestion_origin=origin["congestion_index"],
                        port_congestion_destination=overrides.get(
                            "destination_congestion", dest["congestion_index"]
                        ),
                        **{k: v for k, v in m.items() if k != "date"},
                    )
                )
        frame = engineer(pd.DataFrame(rows), pd.DataFrame(market))
        pred = np.maximum(3, self.pipeline.predict(frame[FEATURES]))
        result = {}
        for vessel in vessels:
            offset = vessels.index(vessel) * len(days)
            points = []
            for idx, day in enumerate(days):
                horizon = max(0, (day - self.as_of).days)
                spread = (
                    1.96 * self.metrics["residual_std"] * (1 + 0.065 * np.sqrt(horizon))
                )
                rate = float(pred[offset + idx])
                points.append(
                    dict(
                        date=day.isoformat(),
                        predicted_rate=round(rate, 3),
                        lower_bound=round(max(0, rate - spread), 3),
                        upper_bound=round(rate + spread, 3),
                    )
                )
            result[vessel] = points
        return result

    def forecast(self, request, vessel="Panamax", overrides=None):
        days = [self.as_of + timedelta(days=i) for i in range(91)]
        points = self.predict_many(request, [vessel], days, overrides)[vessel]
        return dict(
            current_rate=points[0]["predicted_rate"],
            vessel_type=vessel,
            points=points,
            horizons={str(i): points[i] for i in [7, 30, 60, 90]},
            uncertainty_note="Approximate residual ranges, expanded with horizon. Conditional synthetic market scenario, not live or calibrated forecast confidence.",
        )
