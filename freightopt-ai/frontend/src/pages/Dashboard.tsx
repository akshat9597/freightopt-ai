import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  ChartNoAxesCombined,
  Compass,
  Ship,
  TrendingDown,
  TriangleAlert,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import type { Dashboard as DashboardData, Metrics } from "../types";
import { Badge, ErrorState, Loading, Metric, Panel } from "../components/UI";
import { AccuracyChart, Bars, ForecastChart } from "../components/Charts";
import { Recommendation } from "../components/DecisionView";
import { useSettings } from "../components/Settings";
import { number } from "../utils/format";
export default function Dashboard() {
  const { data, error, loading, retry } = useApi<DashboardData>("/dashboard");
  const metrics = useApi<Metrics>("/model/metrics");
  const { money, currency, presentation } = useSettings();
  if (loading) return <Loading />;
  if (error || !data) return <ErrorState message={error} retry={retry} />;
  const k = data.kpis;
  const d = data.decision;
  return (
    <>
      <div className="dashboard-hero">
        <div>
          <div className="eyebrow">
            <span />
            INTELLIGENT CHARTERING COMMAND CENTER
          </div>
          <h1>
            Predict freight. Optimize vessels.
            <br />
            <span>Charter smarter.</span>
          </h1>
          <p>
            AI-powered freight intelligence for overseas bulk cargo procurement
            <br className="desktop-break" /> and India’s East Coast ports.
          </p>
          <Link className="button primary" to="/optimizer">
            <Compass size={17} />
            Optimize a voyage
            <ArrowRight size={16} />
          </Link>
        </div>
        <div
          className="maritime-visual"
          aria-label="Illustrative ocean route from Newcastle to India's East Coast"
        >
          <svg viewBox="0 0 420 220" role="img">
            <defs>
              <pattern
                id="sea"
                width="22"
                height="22"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M0 11 Q5 8 11 11 T22 11"
                  stroke="#d4e2ec"
                  strokeWidth=".7"
                  fill="none"
                />
              </pattern>
            </defs>
            <rect width="420" height="220" fill="url(#sea)" />
            <path
              d="M74 12l28 9 15 27 11 6-13 24-5 38-19 16-12-26-3-30-22-20-17-8 18-28zM260 148l24-22 27 6 23-7 23 15 18 23-6 25-30 8-23-12-29 2-20-11zM195 91l30 5 7 11 27 9 8 11-41-11-18-13z"
              fill="#c3d6df"
            />
            <path
              d="M330 168 Q170 222 108 84"
              stroke="#3c89bd"
              strokeWidth="1.7"
              strokeDasharray="5 5"
              fill="none"
            />
            <circle cx="108" cy="84" r="10" fill="#158678" fillOpacity=".15" />
            <circle cx="108" cy="84" r="4" fill="#158678" />
            <circle cx="330" cy="168" r="10" fill="#347fc2" fillOpacity=".15" />
            <circle cx="330" cy="168" r="4" fill="#347fc2" />
            <text x="120" y="77" fill="#284c65" fontSize="11" fontWeight="600">
              INDIA’S EAST COAST
            </text>
            <text x="290" y="209" fill="#527086" fontSize="11">
              NEWCASTLE
            </text>
            <g transform="translate(194 160) rotate(-15)">
              <rect
                x="-18"
                y="-14"
                width="36"
                height="25"
                rx="8"
                fill="white"
              />
              <path d="M-11 0H11L6 6H-7zM-5-8H5v7H-5z" fill="#347fc2" />
            </g>
            <text x="172" y="144" fill="#527086" fontSize="10">
              5,900 nm · demo route
            </text>
          </svg>
          <div className="route-tag">
            <Ship size={14} />
            <span>5 origin countries</span>
            <i />7 Indian ports
          </div>
        </div>
      </div>
      <div className="section-heading">
        <h2>Market at a glance</h2>
        <span className="subtle">
          <span className="status-dot" />
          Synthetic market snapshot
        </span>
      </div>
      <div className="metrics-grid six">
        <Metric
          label="Market index"
          value={number(k.market_index)}
          detail={
            <span className="text-blue">
              {data.market.index_change_percent > 0 ? "+" : ""}
              {data.market.index_change_percent}% vs 7 days ago
            </span>
          }
          icon={<BarChart3 size={16} />}
        />
        <Metric
          label="Average freight"
          value={
            <>
              {money(k.average_freight, false, 1)}
              <small>/t</small>
            </>
          }
          detail="30-day historical fleet average"
          icon={<Ship size={16} />}
        />
        <Metric
          label="30-day forecast"
          value={
            <>
              {money(k.forecast_30, false, 1)}
              <small>/t</small>
            </>
          }
          detail={
            <span
              className={
                data.market.directional_change < 0 ? "positive" : "negative"
              }
            >
              {data.market.directional_change.toFixed(1)}% · reference route
            </span>
          }
          icon={<TrendingDown size={16} />}
          tone="teal"
        />
        <Metric
          label="Market volatility"
          value={k.volatility >= 0.2 ? "Elevated" : "Moderate"}
          detail={`${(k.volatility * 100).toFixed(1)}% simulated variability`}
          icon={<ChartNoAxesCombined size={16} />}
          tone="amber"
        />
        <Metric
          label="Port alerts"
          value={k.port_alerts.toString().padStart(2, "0")}
          detail="East Coast congestion alerts"
          icon={<TriangleAlert size={16} />}
          tone="amber"
        />
        <Metric
          label="Potential saving"
          value={money(k.potential_saving, true)}
          detail={`${d.saving_percent}% · reference voyage`}
          tone="teal"
        />
      </div>
      <div className="dashboard-main">
        <ForecastChart
          points={data.forecast.points}
          booking={d.recommended_booking_date}
        />
        <div>
          <Recommendation decision={d} compact />
          <Link to="/optimizer?demo=1" className="recommendation-link">
            Explore the full voyage analysis
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>
      {presentation && (
        <div className="presentation-story">
          <Panel title="From market signal to charter decision">
            <div className="story-steps">
              {[
                "Forecast the market",
                "Choose the charter window",
                `Select ${d.recommended_vessel}`,
                "Check both ports",
                `Save ${money(d.potential_saving, true)}`,
                `Review ${d.risk.toLowerCase()} risk`,
              ].map((s, i) => (
                <div key={s}>
                  <span>{i + 1}</span>
                  <strong>{s}</strong>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}
      {!presentation && (
        <>
          <div className="two-col">
            <Panel
              title="Freight by vessel class"
              subtitle={`Reference lot: 70,000t · conditional ${currency}/tonne quotes`}
              action={<Badge>Scenario estimates</Badge>}
            >
              <Bars
                data={data.vessel_rates.map((r) => ({
                  ...r,
                  fill: r.feasible_capacity ? "#397eb9" : "#c7d5df",
                }))}
                valueKey="rate"
                nameKey="vessel"
                monetary
              />
              <p className="fine-print">
                Handysize and Supramax quotes exceed cargo capacity and are not
                charter options for this lot.
              </p>
            </Panel>
            <Panel
              title="East Coast port congestion"
              subtitle="Representative congestion index · 0–100"
              action={
                <Link to="/ports" className="text-link">
                  View ports
                  <ArrowRight size={14} />
                </Link>
              }
            >
              <Bars
                data={data.congestion.map((r) => ({
                  name:
                    r.port === "Sagar / Sandheads"
                      ? "Sandheads"
                      : r.port === "Visakhapatnam"
                        ? "Vizag"
                        : r.port,
                  value: r.congestion,
                  fill: r.congestion >= 60 ? "#d6a654" : "#5b9baf",
                }))}
              />
            </Panel>
          </div>
          <div className="two-col">
            <Panel
              title="Route cost comparison"
              subtitle={`70,000t · compatible strategy estimates in ${currency}`}
            >
              <Bars
                data={data.route_comparison
                  .filter((r) => r.estimated_cost !== null)
                  .map((r) => ({
                    name: `${r.origin_port} → ${r.destination_port === "Visakhapatnam" ? "Vizag" : r.destination_port}`,
                    value: Math.round(r.estimated_cost! / 1000),
                  }))}
                horizontal
                monetary
                height={270}
              />
              <p className="fine-print">
                Values shown in thousands. Port constraints exclude Baltimore →
                Haldia.
              </p>
            </Panel>
            <Panel
              title="Historical vs predicted rates"
              subtitle="Sampled held-out voyages · different routes and cargo lots"
              action={
                <Link to="/models" className="text-link">
                  Model details
                  <ArrowRight size={14} />
                </Link>
              }
            >
              {metrics.data ? (
                <AccuracyChart data={metrics.data.predictions} />
              ) : metrics.error ? (
                <ErrorState message={metrics.error} retry={metrics.retry} />
              ) : (
                <Loading />
              )}
            </Panel>
          </div>
          <Panel
            title="Connected intelligence"
            subtitle="A local-first prototype with a clear path to validated production data."
            action={<Badge tone="low">Demo environment</Badge>}
          >
            <div className="source-grid">
              {data.data_sources.slice(0, 6).map((s) => (
                <div key={s.name}>
                  <span
                    className={
                      s.status === "Connected"
                        ? "status-dot"
                        : "status-dot muted-dot"
                    }
                  />
                  <div>
                    <strong>{s.name}</strong>
                    <small>{s.status}</small>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </>
      )}
      <div className="bottom-note">
        <CalendarDays size={14} />
        Demo as of {data.as_of} · ML estimates are scenario-based and not live
        broker quotes.
      </div>
    </>
  );
}
