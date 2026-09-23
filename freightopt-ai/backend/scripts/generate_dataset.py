"""Generate four years of seeded, explicitly synthetic freight observations."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import numpy as np
import pandas as pd
from app.config import DATA, DEMO_DATE
from app.services.catalog import (
    ORIGINS,
    DESTINATIONS,
    VESSELS,
    CARGOS,
    ROUTES,
    ROUTE_MAP,
    market_state,
)


def generate_dataset():
    DATA.mkdir(parents=True, exist_ok=True)
    rng = np.random.default_rng(26006)
    rows = []
    for day in pd.date_range(
        end=pd.Timestamp(DEMO_DATE) - pd.Timedelta(days=1), periods=1461
    ):
        m = market_state(day.date())
        for _ in range(5):
            origin = ORIGINS[int(rng.integers(len(ORIGINS)))]
            dest = DESTINATIONS[int(rng.integers(len(DESTINATIONS)))]
            vessel = VESSELS[int(rng.integers(4))]
            qty = int(rng.uniform(0.35, 0.99) * vessel["cargo_capacity_tonnes"])
            distance = ROUTE_MAP[origin["name"], dest["name"]]["distance_nm"]
            co = float(np.clip(origin["congestion_index"] + rng.normal(0, 8), 0, 100))
            cd = float(np.clip(dest["congestion_index"] + rng.normal(0, 8), 0, 100))
            cargo = CARGOS[int(rng.integers(len(CARGOS)))]
            utilization = qty / vessel["cargo_capacity_tonnes"]
            size_factor = {
                "Handysize": 1.35,
                "Supramax": 1.13,
                "Panamax": 1,
                "Capesize": 0.83,
            }[vessel["name"]]
            rate = (
                4.5
                + distance * 0.0017
                + m["fuel_price_usd"] * 0.011
                + m["baltic_index"] * 0.0032
                + (co + cd) * 0.022
                + m["commodity_price_usd"] * 0.006
            ) * size_factor
            rate *= 1 + 0.55 * (1 - utilization) ** 2
            rate += 1.2 * np.sin(day.month * 2 * np.pi / 12) + (
                {"Iron Ore": 0.8, "Limestone": 0.3}.get(cargo, 0)
            )
            rate = max(5, rate + rng.normal(0, 0.5 + m["market_volatility"] * 4))
            duration = (
                distance / (vessel["speed_knots"] * 24)
                + qty / origin["handling_rate"]
                + qty / dest["handling_rate"]
                + origin["average_waiting_days"]
                + dest["average_waiting_days"]
            )
            rows.append(
                dict(
                    date=day.date().isoformat(),
                    origin_country=origin["country"],
                    origin_port=origin["name"],
                    destination_port=dest["name"],
                    cargo_type=cargo,
                    cargo_quantity_tonnes=qty,
                    vessel_type=vessel["name"],
                    distance_nm=distance,
                    **m,
                    port_congestion_origin=round(co, 2),
                    port_congestion_destination=round(cd, 2),
                    season=["Winter", "Spring", "Summer", "Autumn"][
                        (day.month % 12) // 3
                    ],
                    month=day.month,
                    day_of_week=day.dayofweek,
                    charter_duration_days=round(duration, 2),
                    freight_rate_usd_per_tonne=round(rate, 3),
                    total_freight_cost_usd=round(rate * qty, 2),
                )
            )
    pd.DataFrame(rows).to_csv(DATA / "freight_history.csv", index=False)
    pd.DataFrame(ROUTES).to_csv(DATA / "routes.csv", index=False)
    print(
        f"Generated {len(rows):,} synthetic records and {len(ROUTES)} representative routes in {DATA}"
    )
    return pd.DataFrame(rows)


if __name__ == "__main__":
    generate_dataset()
