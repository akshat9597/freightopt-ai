import { Activity, Fuel, TrendingUp } from "lucide-react";
import { useApi } from "../hooks/useApi";
import type { HistoryPoint, Market as MarketData } from "../types";
import {
  Badge,
  ErrorState,
  Loading,
  Metric,
  Notice,
  PageTitle,
  Panel,
} from "../components/UI";
import { Bars, ForecastChart, HistoryChart } from "../components/Charts";
import { useSettings } from "../components/Settings";
import { number } from "../utils/format";
export default function Market() {
  const { data, error, loading, retry } =
    useApi<MarketData>("/market/overview");
  const history = useApi<HistoryPoint[]>("/market/history?days=180");
  const { money, currency } = useSettings();
  if (loading) return <Loading />;
  if (error || !data) return <ErrorState message={error} retry={retry} />;
  return (
    <>
      <PageTitle
        eyebrow="MARKET INTELLIGENCE"
        title="Read the market. Find your window."
        description="Freight trends, vessel economics and a 30-day directional outlook."
        action={
          <Badge tone={data.status === "BEARISH" ? "low" : "medium"}>
            {data.status} outlook
          </Badge>
        }
      />
      <div className="metrics-grid four">
        <Metric
          label="Baltic-style market index"
          value={number(data.baltic_index)}
          detail="Simulated index · no Baltic feed"
          icon={<TrendingUp size={17} />}
        />
        <Metric
          label="30-day direction"
          value={`${data.directional_change > 0 ? "+" : ""}${data.directional_change}%`}
          detail={data.status}
          tone="teal"
        />
        <Metric
          label="Bunker fuel"
          value={`${money(data.fuel_price_usd)}/t`}
          detail="Simulated fuel benchmark"
          icon={<Fuel size={17} />}
        />
        <Metric
          label="Market volatility"
          value={`${(data.market_volatility * 100).toFixed(1)}%`}
          detail="Synthetic variation input"
          icon={<Activity size={17} />}
          tone="amber"
        />
      </div>
      <ForecastChart points={data.forecast.points} />
      <div className="two-col">
        <Panel
          title="Historical freight trend"
          subtitle={`180 days · mixed-route daily mean · ${currency}/tonne`}
        >
          {history.data ? (
            <HistoryChart data={history.data} />
          ) : history.error ? (
            <ErrorState message={history.error} retry={history.retry} />
          ) : (
            <Loading />
          )}
        </Panel>
        <Panel
          title="Vessel-wise reference quotes"
          subtitle={`Conditional linehaul freight · ${currency}/tonne`}
        >
          <Bars
            data={data.vessel_rates.map((v) => ({
              ...v,
              fill: v.feasible_capacity ? "#397eb9" : "#bacbd8",
            }))}
            valueKey="rate"
            nameKey="vessel"
            monetary
          />
          <Notice>{data.note}</Notice>
        </Panel>
      </div>
      <Panel title="Forward horizon comparison">
        <div className="horizon-grid">
          {Object.entries(data.forecast.horizons).map(([h, p]) => (
            <div key={h}>
              <span>{h}-DAY FORECAST</span>
              <strong>
                {money(p.predicted_rate, false, 2)}
                <small>/t</small>
              </strong>
              <p>
                {money(p.lower_bound, false, 2)} –{" "}
                {money(p.upper_bound, false, 2)}
              </p>
              <small>Approximate residual range</small>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}
