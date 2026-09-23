from datetime import date
from typing import Literal
from pydantic import BaseModel, Field, ConfigDict, model_validator
from app.config import DEMO_DATE
from app.services.catalog import CARGOS, PORT_BY_NAME

Contract = Literal["Spot", "Short-Term", "Medium-Term", "Multi-Voyage"]
VesselName = Literal["Handysize", "Supramax", "Panamax", "Capesize"]


class VoyageRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)
    cargo_type: str = "Coking Coal"
    cargo_quantity: float = Field(default=70000, ge=1000, le=180000)
    origin_country: str = "Australia"
    origin_port: str = "Newcastle"
    destination_port: str = "Gangavaram"
    start_date: date = date.fromisoformat(DEMO_DATE)
    contract_type: Contract = "Short-Term"
    contract_duration_days: int = Field(default=45, ge=1, le=365)

    @model_validator(mode="after")
    def validate_domain(self):
        if self.cargo_type not in CARGOS:
            raise ValueError("Unsupported cargo type")
        origin = PORT_BY_NAME.get(self.origin_port)
        dest = PORT_BY_NAME.get(self.destination_port)
        if not origin or origin["country"] == "India":
            raise ValueError("Select a supported overseas origin port")
        if origin["country"] != self.origin_country:
            raise ValueError("Origin port does not belong to origin country")
        if not dest or dest["country"] != "India":
            raise ValueError("Select a supported Indian destination")
        delta = (self.start_date - date.fromisoformat(DEMO_DATE)).days
        if delta < 0 or delta > 90:
            raise ValueError(
                f"Start date must be within 90 days of demo as-of date {DEMO_DATE}"
            )
        return self


class SimulationRequest(VoyageRequest):
    fuel_price_usd: float = Field(default=610, ge=200, le=1500)
    baltic_index: float = Field(default=1740, ge=300, le=5000)
    destination_congestion: float = Field(default=26, ge=0, le=100)
    weather: Literal["normal", "rough weather", "cyclone risk", "high swell"] = "normal"


class CompatibilityRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    vessel_type: VesselName
    port_name: str


class CompatibilityResult(BaseModel):
    port: str
    compatible: bool
    status: str
    reasons: list[str]
    checks: list[dict]


class ForecastPoint(BaseModel):
    date: str
    predicted_rate: float
    lower_bound: float
    upper_bound: float


class ForecastResponse(BaseModel):
    current_rate: float
    vessel_type: str
    points: list[ForecastPoint]
    horizons: dict[str, ForecastPoint]
    uncertainty_note: str


class CostBreakdown(BaseModel):
    freight_cost: float
    fuel_estimate: float
    port_charges: float
    waiting_cost: float
    idle_cost: float
    commitment_cost: float
    total: float
    cost_per_tonne: float
    note: str


class VesselEvaluation(BaseModel):
    vessel: str
    compatible: bool
    reasons: list[str]
    estimated_cost: float | None
    utilization: float
    risk: str
    score: float
    rate: float | None
    compatibility: list[CompatibilityResult]
    timing: dict
    costs: CostBreakdown | None


class Alert(BaseModel):
    id: str
    title: str
    detail: str
    severity: str
    source: str = "Simulation"


class OptimizationResponse(BaseModel):
    id: int | None = None
    feasible: bool
    recommendation: str
    opportunity_score: int
    recommended_vessel: str | None
    recommended_booking_date: str | None
    charter_window_end: str | None
    forecast_rate: float | None
    estimated_total_cost: float | None
    potential_saving: float
    saving_percent: float
    confidence: float
    risk: str
    reasons: list[str]
    vessel_comparison: list[VesselEvaluation]
    forecast: list[ForecastPoint]
    alerts: list[Alert]
    spot_cost: CostBreakdown | None
    optimized_cost: CostBreakdown | None
    risk_factors: list[dict]
    score_breakdown: list[dict]
    alternatives: list[dict]
    timing: dict
    voyage: dict
    market: dict
    currency: dict
    assumptions: list[str]
