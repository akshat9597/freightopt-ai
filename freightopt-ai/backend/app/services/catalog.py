"""Representative engineering inputs, NOT official port specifications."""

import math

CARGOS = [
    "Coking Coal",
    "Thermal Coal",
    "Iron Ore",
    "Limestone",
    "Dolomite",
    "PCI Coal",
    "Other Bulk Cargo",
]
# name, country, lat, lon, draft(m), LOA(m), beam(m), handling(t/day), turnaround(days), wait(days), congestion(0..100), charges(USD)
_RAW = [
    (
        "Newcastle",
        "Australia",
        -32.93,
        151.78,
        18.5,
        300,
        50,
        42000,
        3.2,
        1.2,
        35,
        85000,
    ),
    (
        "Hay Point",
        "Australia",
        -21.28,
        149.30,
        19.0,
        310,
        52,
        48000,
        3.0,
        1.5,
        42,
        90000,
    ),
    (
        "Gladstone",
        "Australia",
        -23.85,
        151.25,
        17.0,
        300,
        48,
        38000,
        3.5,
        1.0,
        30,
        78000,
    ),
    (
        "Port Hedland",
        "Australia",
        -20.31,
        118.58,
        19.5,
        330,
        58,
        55000,
        2.8,
        1.8,
        48,
        98000,
    ),
    (
        "Baltimore",
        "United States",
        39.26,
        -76.57,
        15.2,
        290,
        45,
        24000,
        4.0,
        1.4,
        38,
        105000,
    ),
    (
        "Norfolk",
        "United States",
        36.85,
        -76.29,
        16.0,
        300,
        48,
        32000,
        3.5,
        1.1,
        32,
        98000,
    ),
    (
        "New Orleans",
        "United States",
        29.95,
        -90.07,
        14.5,
        290,
        45,
        30000,
        4.2,
        2.0,
        52,
        110000,
    ),
    ("Maputo", "Mozambique", -25.96, 32.58, 14.2, 250, 40, 19000, 4.5, 1.9, 51, 62000),
    ("Beira", "Mozambique", -19.83, 34.84, 10.5, 200, 32, 10000, 5.5, 2.6, 68, 48000),
    ("Nacala", "Mozambique", -14.54, 40.67, 16.5, 290, 48, 27000, 3.8, 1.0, 29, 64000),
    (
        "Balikpapan",
        "Indonesia",
        -1.27,
        116.83,
        14.0,
        240,
        40,
        18000,
        4.3,
        1.5,
        43,
        55000,
    ),
    ("Samarinda", "Indonesia", -0.50, 117.15, 10.0, 185, 30, 9000, 5.5, 2.5, 65, 40000),
    ("Taboneo", "Indonesia", -3.70, 114.42, 18.5, 310, 50, 23000, 4.4, 1.7, 46, 58000),
    ("Vostochny", "Russia", 42.73, 133.08, 16.5, 300, 48, 30000, 3.9, 1.6, 44, 88000),
    ("Paradip", "India", 20.26, 86.68, 17.1, 300, 50, 32000, 3.8, 2.3, 67, 72000),
    ("Visakhapatnam", "India", 17.69, 83.29, 16.5, 290, 48, 30000, 3.5, 1.4, 42, 76000),
    ("Gangavaram", "India", 17.62, 83.23, 20.0, 330, 58, 45000, 2.8, 0.8, 26, 82000),
    ("Gopalpur", "India", 19.26, 84.92, 14.5, 250, 42, 22000, 4.2, 1.2, 37, 58000),
    ("Dhamra", "India", 20.80, 86.95, 18.5, 310, 52, 38000, 3.2, 1.1, 34, 78000),
    (
        "Sagar / Sandheads",
        "India",
        21.65,
        88.05,
        12.0,
        230,
        35,
        16000,
        5.5,
        3.0,
        76,
        62000,
    ),
    ("Haldia", "India", 22.02, 88.06, 8.5, 190, 30, 14000, 6.0, 3.5, 82, 54000),
]
KEYS = [
    "name",
    "country",
    "latitude",
    "longitude",
    "max_draft",
    "max_loa",
    "max_beam",
    "handling_rate",
    "average_turnaround_days",
    "average_waiting_days",
    "congestion_index",
    "port_charges_usd",
]
PORTS = [dict(zip(KEYS, row), data_source="Representative demo data") for row in _RAW]
PORT_BY_NAME = {p["name"]: p for p in PORTS}
ORIGINS = [p for p in PORTS if p["country"] != "India"]
DESTINATIONS = [p for p in PORTS if p["country"] == "India"]
VESSELS = [
    dict(
        name="Handysize",
        min_dwt=10000,
        max_dwt=40000,
        typical_loa=180,
        beam=28,
        laden_draft=10.0,
        speed_knots=12.5,
        fuel_tonnes_day=19,
        daily_charter_cost=12500,
    ),
    dict(
        name="Supramax",
        min_dwt=40000,
        max_dwt=60000,
        typical_loa=200,
        beam=32,
        laden_draft=12.5,
        speed_knots=13.0,
        fuel_tonnes_day=25,
        daily_charter_cost=17000,
    ),
    dict(
        name="Panamax",
        min_dwt=60000,
        max_dwt=85000,
        typical_loa=225,
        beam=32.3,
        laden_draft=14.5,
        speed_knots=13.5,
        fuel_tonnes_day=33,
        daily_charter_cost=22000,
    ),
    dict(
        name="Capesize",
        min_dwt=85000,
        max_dwt=200000,
        typical_loa=292,
        beam=45,
        laden_draft=18.2,
        speed_knots=14.0,
        fuel_tonnes_day=52,
        daily_charter_cost=34000,
    ),
]
for v in VESSELS:
    v["cargo_suitability"] = CARGOS.copy()
    v["cargo_capacity_tonnes"] = int(v["max_dwt"] * 0.9)
VESSEL_BY_NAME = {v["name"]: v for v in VESSELS}
# Base sailing estimates include broad sea-lane detours (not navigational routes).
BASE_DISTANCE = {
    "Newcastle": 5900,
    "Hay Point": 5300,
    "Gladstone": 5500,
    "Port Hedland": 3600,
    "Baltimore": 11200,
    "Norfolk": 11000,
    "New Orleans": 12200,
    "Maputo": 4450,
    "Beira": 4100,
    "Nacala": 3600,
    "Balikpapan": 3100,
    "Samarinda": 3200,
    "Taboneo": 2900,
    "Vostochny": 5300,
}
DEST_OFFSET = {
    "Paradip": 120,
    "Visakhapatnam": 30,
    "Gangavaram": 0,
    "Gopalpur": 80,
    "Dhamra": 180,
    "Sagar / Sandheads": 240,
    "Haldia": 310,
}
ROUTES = [
    dict(
        origin_port=o["name"],
        destination_port=d["name"],
        distance_nm=BASE_DISTANCE[o["name"]] + DEST_OFFSET[d["name"]],
        estimated_sailing_days=round(
            (BASE_DISTANCE[o["name"]] + DEST_OFFSET[d["name"]]) / (13.5 * 24), 2
        ),
    )
    for o in ORIGINS
    for d in DESTINATIONS
]
ROUTE_MAP = {(r["origin_port"], r["destination_port"]): r for r in ROUTES}


def market_state(day):
    """Reproducible scenario curve; no live market feed is implied."""
    from datetime import date

    t = (day - date(2022, 9, 13)).days
    return dict(
        fuel_price_usd=round(610 + 60 * math.sin(t / 95) + 23 * math.sin(t / 17), 2),
        baltic_index=round(1740 + 360 * math.sin(t / 52) + 160 * math.cos(t / 19)),
        commodity_price_usd=round(180 + 36 * math.sin(t / 83), 2),
        market_volatility=round(0.12 + 0.10 * (1 + math.sin(t / 31)) / 2, 4),
    )
