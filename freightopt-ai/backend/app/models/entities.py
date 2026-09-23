from datetime import datetime, timezone
from sqlalchemy import String, Float, JSON, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.database.session import Base


class Port(Base):
    __tablename__ = "ports"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80), unique=True)
    country: Mapped[str] = mapped_column(String(60))
    details: Mapped[dict] = mapped_column(JSON)


class Vessel(Base):
    __tablename__ = "vessels"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(40), unique=True)
    details: Mapped[dict] = mapped_column(JSON)


class Route(Base):
    __tablename__ = "routes"
    id: Mapped[int] = mapped_column(primary_key=True)
    origin_port: Mapped[str] = mapped_column(String(80))
    destination_port: Mapped[str] = mapped_column(String(80))
    distance_nm: Mapped[float] = mapped_column(Float)
    details: Mapped[dict] = mapped_column(JSON)


class FreightRecord(Base):
    __tablename__ = "freight_records"
    id: Mapped[int] = mapped_column(primary_key=True)
    date: Mapped[str] = mapped_column(String(10), index=True)
    rate: Mapped[float] = mapped_column(Float)
    details: Mapped[dict] = mapped_column(JSON)


class Forecast(Base):
    __tablename__ = "forecasts"
    id: Mapped[int] = mapped_column(primary_key=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
    request: Mapped[dict] = mapped_column(JSON)
    result: Mapped[dict] = mapped_column(JSON)


class OptimizationRun(Base):
    __tablename__ = "optimization_runs"
    id: Mapped[int] = mapped_column(primary_key=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
    request: Mapped[dict] = mapped_column(JSON)
    result: Mapped[dict] = mapped_column(JSON)


class AlertRecord(Base):
    __tablename__ = "alerts"
    id: Mapped[int] = mapped_column(primary_key=True)
    details: Mapped[dict] = mapped_column(JSON)
