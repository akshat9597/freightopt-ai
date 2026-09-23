import { Link } from "react-router-dom";
import { ArrowRight, Route as RouteIcon } from "lucide-react";
import { useApi } from "../hooks/useApi";
import type { RouteRow } from "../types";
import {
  Badge,
  ErrorState,
  Loading,
  Notice,
  PageTitle,
  Panel,
  Progress,
} from "../components/UI";
import { useSettings } from "../components/Settings";
import { number } from "../utils/format";
export default function Routes() {
  const { data, error, loading, retry } = useApi<RouteRow[]>("/routes");
  const { money } = useSettings();
  if (loading) return <Loading />;
  if (error || !data) return <ErrorState message={error} retry={retry} />;
  return (
    <>
      <PageTitle
        eyebrow="ROUTE INTELLIGENCE"
        title="One network. Better decisions."
        description="Compare key trade lanes into India’s East Coast with consistent voyage assumptions."
        action={
          <Link to="/optimizer" className="button primary">
            <RouteIcon size={16} />
            Plan a voyage
          </Link>
        }
      />
      <Notice>
        Reference comparison: 70,000t of coking coal, a 45-day Short-Term
        planning contract, and the demo as-of date. Route distances are
        approximate sailing estimates, not navigational guidance.
      </Notice>
      <div className="route-grid">
        {data.map((r) => (
          <Panel key={r.origin_port + r.destination_port}>
            <div className="route-card-heading">
              <span className="icon-box">
                <RouteIcon size={21} />
              </span>
              <Badge tone={r.feasible ? "low" : "critical"}>
                {r.feasible ? "Viable route" : "No compatible vessel"}
              </Badge>
            </div>
            <div className="route-endpoints">
              <div>
                <small>LOADING</small>
                <h2>{r.origin_port}</h2>
              </div>
              <ArrowRight size={22} />
              <div>
                <small>DISCHARGE</small>
                <h2>{r.destination_port}</h2>
              </div>
            </div>
            <div className="route-numbers">
              <div>
                <span>Distance</span>
                <strong>
                  {number(r.distance_nm)}
                  <small> nm</small>
                </strong>
              </div>
              <div>
                <span>Current rate</span>
                <strong>
                  {money(r.current_rate, false, 2)}
                  <small>/t</small>
                </strong>
              </div>
              <div>
                <span>30-day forecast</span>
                <strong>
                  {money(r.forecast_30, false, 2)}
                  <small>/t</small>
                </strong>
              </div>
            </div>
            <div className="route-meta">
              <span>{r.recommended_vessel || "Infrastructure constraint"}</span>
              <span>Congestion {r.congestion}/100</span>
            </div>
            <div className="opportunity">
              <div>
                <span>Opportunity score</span>
                <strong>{r.opportunity_score}/100</strong>
              </div>
              <Progress
                value={r.opportunity_score}
                tone={r.feasible ? "teal" : "red"}
              />
            </div>
            {!r.feasible && (
              <p className="fine-print">
                Haldia’s representative draft limit rejects all supported
                full-laden vessel classes. Change port or review official
                part-load/lighterage options outside this MVP.
              </p>
            )}
          </Panel>
        ))}
      </div>
    </>
  );
}
