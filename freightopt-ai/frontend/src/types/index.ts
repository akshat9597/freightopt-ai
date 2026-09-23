export interface Port {
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  max_draft: number;
  max_loa: number;
  max_beam: number;
  handling_rate: number;
  average_turnaround_days: number;
  average_waiting_days: number;
  congestion_index: number;
  port_charges_usd: number;
  data_source: string;
}
export interface DataSource {
  name: string;
  status: string;
  description: string;
}
export interface Config {
  as_of: string;
  cargos: string[];
  countries: string[];
  usd_inr: number;
  disclaimer: string;
  port_disclaimer: string;
  data_sources: DataSource[];
}
export interface Voyage {
  cargo_type: string;
  cargo_quantity: number;
  origin_country: string;
  origin_port: string;
  destination_port: string;
  start_date: string;
  contract_type: "Spot" | "Short-Term" | "Medium-Term" | "Multi-Voyage";
  contract_duration_days: number;
}
export interface ForecastPoint {
  date: string;
  predicted_rate: number;
  lower_bound: number;
  upper_bound: number;
}
export interface Forecast {
  current_rate: number;
  vessel_type: string;
  points: ForecastPoint[];
  horizons: Record<string, ForecastPoint>;
  uncertainty_note: string;
}
export interface Compatibility {
  port: string;
  compatible: boolean;
  status: string;
  reasons: string[];
  checks: {
    parameter: string;
    vessel_value: number;
    port_limit: number;
    passed: boolean;
  }[];
}
export interface Costs {
  freight_cost: number;
  fuel_estimate: number;
  port_charges: number;
  waiting_cost: number;
  idle_cost: number;
  commitment_cost: number;
  total: number;
  cost_per_tonne: number;
  note: string;
}
export interface Timing {
  loading_days: number;
  sailing_days: number;
  discharge_days: number;
  origin_waiting_days: number;
  destination_waiting_days: number;
  port_waiting_days: number;
  potential_idle_days: number;
  weather_delay_days: number;
  weather: string;
  total_days: number;
  port_turnaround_days: number;
  idle_risk_score: number;
  idle_risk: string;
}
export interface VesselEvaluation {
  vessel: string;
  compatible: boolean;
  reasons: string[];
  estimated_cost: number | null;
  utilization: number;
  risk: string;
  score: number;
  rate: number | null;
  compatibility: Compatibility[];
  timing: Timing;
  costs: Costs | null;
}
export interface Alert {
  id: string;
  title: string;
  detail: string;
  severity: string;
  source: string;
}
export interface Alternative {
  port: string;
  vessel: string;
  compatible: boolean;
  distance_nm: number;
  freight_rate: number;
  congestion: number;
  handling_rate: number;
  estimated_total_cost: number;
  saving_percent: number | null;
  turnaround_improvement_days: number | null;
  waiting_days: number;
}
export interface Decision {
  id?: number;
  feasible: boolean;
  recommendation: string;
  opportunity_score: number;
  recommended_vessel: string | null;
  recommended_booking_date: string | null;
  charter_window_end: string | null;
  forecast_rate: number | null;
  estimated_total_cost: number | null;
  potential_saving: number;
  saving_percent: number;
  confidence: number;
  risk: string;
  reasons: string[];
  vessel_comparison: VesselEvaluation[];
  forecast: ForecastPoint[];
  alerts: Alert[];
  spot_cost: Costs | null;
  optimized_cost: Costs | null;
  risk_factors: {
    name: string;
    score: number;
    level: string;
    explanation: string;
  }[];
  score_breakdown: { factor: string; value: number; detail: string }[];
  alternatives: Alternative[];
  timing: Timing | Record<string, never>;
  voyage: Voyage;
  market: MarketState;
  currency: { usd_inr: number; source: string };
  assumptions: string[];
}
export interface MarketState {
  fuel_price_usd: number;
  baltic_index: number;
  commodity_price_usd: number;
  market_volatility: number;
}
export interface VesselRate {
  vessel: string;
  rate: number;
  utilization: number;
  capacity: number;
  feasible_capacity: boolean;
}
export interface Market extends MarketState {
  index_change_percent: number;
  status: string;
  directional_change: number;
  forecast: Forecast;
  vessel_rates: VesselRate[];
  note: string;
}
export interface RouteRow {
  origin_port: string;
  destination_port: string;
  distance_nm: number;
  estimated_sailing_days: number;
  current_rate: number | null;
  forecast_30: number | null;
  recommended_vessel: string | null;
  congestion: number;
  opportunity_score: number;
  estimated_cost: number | null;
  feasible: boolean;
}
export interface Dashboard {
  as_of: string;
  market: Market;
  kpis: {
    current_rate: number;
    forecast_30: number;
    average_freight: number;
    market_index: number;
    volatility: number;
    port_alerts: number;
    potential_saving: number;
    opportunity_score: number;
  };
  decision: Decision;
  forecast: Forecast;
  vessel_rates: VesselRate[];
  congestion: { port: string; congestion: number }[];
  route_comparison: RouteRow[];
  data_sources: DataSource[];
  disclaimer: string;
  port_disclaimer: string;
  currency: { usd_inr: number };
}
export interface HistoryPoint {
  date: string;
  rate: number;
  baltic_index: number;
  fuel_price: number;
}
export interface Metrics {
  selected_model: string;
  training_records: number;
  validation_records: number;
  testing_records: number;
  production_training_records: number;
  metrics: { mae: number; rmse: number; r2: number };
  models: {
    model: string;
    validation: { mae: number; rmse: number; r2: number };
    test: { mae: number; rmse: number; r2: number };
  }[];
  feature_importance: { feature: string; importance: number }[];
  predictions: { date: string; actual: number; predicted: number }[];
  train_end: string;
  test_start: string;
  data_start: string;
  data_end: string;
  evaluation_note: string;
}
export interface Simulation extends Voyage {
  fuel_price_usd: number;
  baltic_index: number;
  destination_congestion: number;
  weather: "normal" | "rough weather" | "cyclone risk" | "high swell";
}
