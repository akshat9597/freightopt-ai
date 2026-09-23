"""Replace these adapters with validated licensed providers; no network dependency."""

from typing import Protocol
from datetime import date
from app.services.catalog import market_state, PORTS


class MarketProvider(Protocol):
    def snapshot(self, day: date) -> dict: ...


class PortProvider(Protocol):
    def ports(self) -> list[dict]: ...


class DemoMarketProvider:
    def snapshot(self, day):
        return market_state(day)


class DemoPortProvider:
    def ports(self):
        return PORTS


DATA_SOURCES = [
    {
        "name": "Synthetic Historical Freight",
        "status": "Connected",
        "description": "7,305 reproducible synthetic observations",
    },
    {
        "name": "Port Master Data",
        "status": "Connected",
        "description": "Representative loading and discharge constraints",
    },
    *[
        {
            "name": name,
            "status": "Demo",
            "description": "No external connection configured",
        }
        for name in [
            "AIS",
            "Live Baltic Feed",
            "Weather",
            "Commodity Feed",
            "Bunker Prices",
            "Port Congestion",
        ]
    ],
]
