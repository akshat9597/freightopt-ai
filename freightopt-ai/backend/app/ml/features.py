import numpy as np
import pandas as pd

CATEGORICAL = [
    "origin_country",
    "origin_port",
    "destination_port",
    "cargo_type",
    "vessel_type",
]
NUMERIC = [
    "cargo_quantity_tonnes",
    "distance_nm",
    "fuel_price_usd",
    "commodity_price_usd",
    "baltic_index",
    "port_congestion_origin",
    "port_congestion_destination",
    "market_volatility",
    "month_sin",
    "month_cos",
    "day_of_week",
    "baltic_lag_1",
    "baltic_lag_7",
    "baltic_rolling_7",
    "baltic_rolling_30",
    "fuel_lag_1",
    "fuel_rolling_7",
]
FEATURES = CATEGORICAL + NUMERIC


def engineer(rows: pd.DataFrame, market_days: pd.DataFrame) -> pd.DataFrame:
    """All lag/rolling features are strictly shifted; never use target or cost."""
    df = rows.copy()
    df["date"] = pd.to_datetime(df["date"]).dt.normalize()
    market = market_days.copy()
    market["date"] = pd.to_datetime(market["date"]).dt.normalize()
    market = (
        market.groupby("date")[["baltic_index", "fuel_price_usd"]].mean().sort_index()
    )
    market["baltic_lag_1"] = market.baltic_index.shift(1)
    market["baltic_lag_7"] = market.baltic_index.shift(7)
    market["baltic_rolling_7"] = (
        market.baltic_index.shift(1).rolling(7, min_periods=1).mean()
    )
    market["baltic_rolling_30"] = (
        market.baltic_index.shift(1).rolling(30, min_periods=1).mean()
    )
    market["fuel_lag_1"] = market.fuel_price_usd.shift(1)
    market["fuel_rolling_7"] = (
        market.fuel_price_usd.shift(1).rolling(7, min_periods=1).mean()
    )
    df = df.merge(
        market.drop(columns=["baltic_index", "fuel_price_usd"]), on="date", how="left"
    )
    df["month_sin"] = np.sin(df.date.dt.month * 2 * np.pi / 12)
    df["month_cos"] = np.cos(df.date.dt.month * 2 * np.pi / 12)
    df["day_of_week"] = df.date.dt.dayofweek
    return df
