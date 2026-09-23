import pandas as pd
from sqlalchemy import select, func
from app.config import DATA
from app.database.session import Base, engine, SessionLocal
from app.models.entities import Port, Vessel, Route, FreightRecord, AlertRecord
from app.services.catalog import PORTS, VESSELS, ROUTES


def seed():
    Base.metadata.create_all(engine)
    with SessionLocal.begin() as db:
        for cls, rows in [
            (
                Port,
                [dict(name=p["name"], country=p["country"], details=p) for p in PORTS],
            ),
            (Vessel, [dict(name=v["name"], details=v) for v in VESSELS]),
            (
                Route,
                [
                    dict(
                        origin_port=r["origin_port"],
                        destination_port=r["destination_port"],
                        distance_nm=r["distance_nm"],
                        details=r,
                    )
                    for r in ROUTES
                ],
            ),
        ]:
            if not db.scalar(select(func.count()).select_from(cls)):
                db.add_all([cls(**r) for r in rows])
        if not db.scalar(select(func.count()).select_from(FreightRecord)):
            rows = pd.read_csv(DATA / "freight_history.csv").to_dict(orient="records")
            db.add_all(
                [
                    FreightRecord(
                        date=r["date"], rate=r["freight_rate_usd_per_tonne"], details=r
                    )
                    for r in rows
                ]
            )
        if not db.scalar(select(func.count()).select_from(AlertRecord)):
            db.add(
                AlertRecord(
                    details=dict(
                        id="availability",
                        title="Panamax availability tightening",
                        detail="Simulated charter desk advisory: reduced vessel supply in the next two weeks. Validate broker availability before fixing.",
                        severity="MEDIUM",
                        source="Simulation",
                    )
                )
            )
