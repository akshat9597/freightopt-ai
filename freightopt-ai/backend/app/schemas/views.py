"""Typed read-model contracts for catalogs, charts and model analytics."""

from pydantic import BaseModel
from app.schemas.domain import ForecastResponse


class DataSource(BaseModel):
    name: str
    status: str
    description: str


class ConfigResponse(BaseModel):
    as_of: str
    cargos: list[str]
    countries: list[str]
    usd_inr: float
    disclaimer: str
    port_disclaimer: str
    data_sources: list[DataSource]


class VesselResponse(BaseModel):
    name: str
    min_dwt: int
    max_dwt: int
    typical_loa: float
    beam: float
    laden_draft: float
    speed_knots: float
    fuel_tonnes_day: float
    daily_charter_cost: float
    cargo_suitability: list[str]
    cargo_capacity_tonnes: int


class RouteDistance(BaseModel):
    origin_port: str
    destination_port: str
    distance_nm: float
    estimated_sailing_days: float


class RouteIntelligence(RouteDistance):
    current_rate: float | None
    forecast_30: float | None
    recommended_vessel: str | None
    congestion: float
    opportunity_score: int
    estimated_cost: float | None
    feasible: bool


class HistoryPoint(BaseModel):
    date: str
    rate: float
    baltic_index: float
    fuel_price: float


class VesselRate(BaseModel):
    vessel: str
    rate: float
    utilization: float
    capacity: int
    feasible_capacity: bool


class MarketResponse(BaseModel):
    fuel_price_usd: float
    baltic_index: float
    commodity_price_usd: float
    market_volatility: float
    index_change_percent: float
    status: str
    directional_change: float
    forecast: ForecastResponse
    vessel_rates: list[VesselRate]
    note: str


class EvaluationMetrics(BaseModel):
    mae: float
    rmse: float
    r2: float


class ModelComparison(BaseModel):
    model: str
    validation: EvaluationMetrics
    test: EvaluationMetrics


class FeatureImportance(BaseModel):
    feature: str
    importance: float


class EvaluatedPrediction(BaseModel):
    date: str
    actual: float
    predicted: float


class MetricsResponse(BaseModel):
    selected_model: str
    training_records: int
    validation_records: int
    testing_records: int
    production_training_records: int
    metrics: EvaluationMetrics
    models: list[ModelComparison]
    residual_std: float
    feature_importance: list[FeatureImportance]
    predictions: list[EvaluatedPrediction]
    train_end: str
    test_start: str
    data_start: str
    data_end: str
    evaluation_note: str
