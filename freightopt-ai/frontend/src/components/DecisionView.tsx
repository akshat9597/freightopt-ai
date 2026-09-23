import { useEffect, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Download,
  Ship,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import type { Decision, VesselEvaluation } from "../types";
import { number, shortDate, fullDate } from "../utils/format";
import { useSettings } from "./Settings";
import { Badge, Empty, Metric, Notice, Panel, Progress, Term } from "./UI";
import { ForecastChart } from "./Charts";

export function Recommendation({
  decision,
  compact = false,
}: {
  decision: Decision;
  compact?: boolean;
}) {
  const { money } = useSettings();
  return (
    <section className={`recommendation ${compact ? "compact" : ""}`}>
      <div className="recommendation-title">
        <span>
          <Sparkles size={17} />
          AI RECOMMENDATION
        </span>
        <Badge tone={decision.feasible ? "low" : "critical"}>
          {decision.feasible ? "Analysis complete" : "Action required"}
        </Badge>
      </div>
      <div className="signal">
        <span className="signal-indicator" />
        {decision.recommendation}
      </div>
      <p className="recommendation-sub">
        {decision.feasible
          ? decision.recommendation === "WAIT"
            ? "A better charter window is ahead."
            : decision.recommendation === "HIGH-RISK MARKET"
              ? "Resolve the risk warnings before committing."
              : "Your next charter decision, informed by data."
          : "Review your port selection or cargo lot size."}
      </p>
      {decision.feasible ? (
        <>
          <div className="recommendation-grid">
            <div>
              <span>
                <Ship size={14} />
                Recommended vessel
              </span>
              <strong>{decision.recommended_vessel}</strong>
            </div>
            <div>
              <span>
                <CalendarDays size={14} />
                Planning window
              </span>
              <strong>
                {shortDate(decision.recommended_booking_date!)} –{" "}
                {shortDate(decision.charter_window_end!)}
              </strong>
            </div>
            <div>
              <span>Linehaul freight</span>
              <strong>
                {money(decision.forecast_rate, false, 2)}
                <small> /t</small>
              </strong>
            </div>
            <div>
              <span>Potential saving</span>
              <strong
                className={
                  decision.potential_saving >= 0 ? "positive" : "negative"
                }
              >
                {money(decision.potential_saving, true)}
              </strong>
            </div>
          </div>
          <div className="opportunity">
            <div>
              <span>Market opportunity</span>
              <strong>
                {decision.opportunity_score}
                <small> / 100</small>
              </strong>
            </div>
            <Progress value={decision.opportunity_score} tone="teal" />
          </div>
          <div className="recommendation-footer">
            <span>
              <ShieldCheck size={14} />
              {Math.round(decision.confidence * 100)}% heuristic confidence
            </span>
            <Badge tone={decision.risk}>{decision.risk} risk</Badge>
          </div>
        </>
      ) : (
        <p>{decision.reasons[0]}</p>
      )}
    </section>
  );
}
export function VesselTable({
  rows,
  recommended,
}: {
  rows: VesselEvaluation[];
  recommended?: string | null;
}) {
  const { money } = useSettings();
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Vessel / constraints</th>
            <th>Compatibility</th>
            <th>Estimated cost</th>
            <th>Utilization</th>
            <th>Idle risk</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.vessel}
              className={r.vessel === recommended ? "selected-row" : ""}
            >
              <td>
                <strong className="inline-title">
                  <Ship size={16} />
                  {r.vessel}
                  {r.vessel === recommended && (
                    <span className="recommended-label">Recommended</span>
                  )}
                </strong>
                <details>
                  <summary>
                    {r.compatible
                      ? "View port checks"
                      : `${r.reasons.length} rejection reason${r.reasons.length > 1 ? "s" : ""}`}
                  </summary>
                  {r.reasons.map((reason, i) => (
                    <p key={i} className="reason-line">
                      {reason}
                    </p>
                  ))}
                  {r.compatibility.map((c) => (
                    <p key={c.port} className="reason-line">
                      {c.port}:{" "}
                      {c.checks
                        .map(
                          (x) =>
                            `${x.parameter} ${x.vessel_value}/${x.port_limit}m ${x.passed ? "✓" : "×"}`,
                        )
                        .join(" · ")}
                    </p>
                  ))}
                </details>
              </td>
              <td>
                <Badge tone={r.compatible ? "low" : "critical"}>
                  {r.compatible ? "Compatible" : "Rejected"}
                </Badge>
              </td>
              <td>{money(r.estimated_cost, true)}</td>
              <td>
                {number(r.utilization, 1)}%
                <Progress
                  value={r.utilization}
                  tone={r.utilization > 100 ? "red" : "blue"}
                />
              </td>
              <td>
                <Badge tone={r.risk}>{r.risk}</Badge>
              </td>
              <td>
                <strong>{r.compatible ? r.score : "—"}</strong>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function DecisionDetails({
  decision,
  report = false,
}: {
  decision: Decision;
  report?: boolean;
}) {
  const { money, currency, presentation } = useSettings();
  const [reportOpen, setReportOpen] = useState(false);
  useEffect(() => {
    if (!reportOpen) return;
    document.body.classList.add("report-open");
    return () => document.body.classList.remove("report-open");
  }, [reportOpen]);
  const selected = decision.vessel_comparison.find(
    (v) => v.vessel === decision.recommended_vessel,
  );
  const print = () => {
    const closed = Array.from(
      document.querySelectorAll<HTMLDetailsElement>(
        ".report-modal details:not([open])",
      ),
    );
    closed.forEach((d) => (d.open = true));
    document.body.classList.add("printing-report");
    window.print();
    document.body.classList.remove("printing-report");
    closed.forEach((d) => (d.open = false));
  };
  return (
    <div className={`decision-details ${report ? "report-view" : ""}`}>
      <div className="report-only">
        <h1>FreightOpt AI · Executive Decision Report</h1>
        <p>AI-Powered Freight Forecasting & Vessel Chartering Intelligence</p>
        <p>
          {decision.voyage.origin_port}, {decision.voyage.origin_country} →{" "}
          {decision.voyage.destination_port}, India
        </p>
        <p>
          {number(decision.voyage.cargo_quantity)} tonnes ·{" "}
          {decision.voyage.cargo_type} · {decision.voyage.contract_type} ·{" "}
          {decision.voyage.contract_duration_days} days · Desired start:{" "}
          {fullDate(decision.voyage.start_date)}
        </p>
        <Recommendation decision={decision} />
      </div>
      {!report && (
        <div className="section-heading no-print">
          <div>
            <h2>Voyage decision report</h2>
            <p>
              {decision.voyage.origin_port} → {decision.voyage.destination_port}{" "}
              · {number(decision.voyage.cargo_quantity)}t ·{" "}
              {decision.voyage.cargo_type}
            </p>
          </div>
          <button
            className="button secondary"
            onClick={() => setReportOpen(true)}
          >
            <Download size={16} />
            Generate Decision Report
          </button>
        </div>
      )}
      {decision.feasible && (
        <ForecastChart
          points={decision.forecast}
          subtitle={`${decision.voyage.origin_port} → ${decision.voyage.destination_port} · ${decision.recommended_vessel} · ${number(decision.voyage.cargo_quantity)}t · before contract discount`}
          booking={decision.recommended_booking_date}
        />
      )}
      <Panel
        title="Vessel optimization"
        subtitle="Every vessel is checked against both ports and conservative cargo capacity."
        action={<Term name="DWT" />}
      >
        <VesselTable
          rows={decision.vessel_comparison}
          recommended={decision.recommended_vessel}
        />
      </Panel>
      {decision.feasible && decision.spot_cost && decision.optimized_cost && (
        <div className="two-col">
          <Panel
            title="Cost comparison"
            subtitle={`Per voyage · ${currency} · demo conversion`}
          >
            <div className="cost-summary">
              <div>
                <span>Current spot estimate</span>
                <strong>{money(decision.spot_cost.total, true)}</strong>
              </div>
              <ArrowDownRight size={24} />
              <div className="positive">
                <span>AI strategy estimate</span>
                <strong>{money(decision.optimized_cost.total, true)}</strong>
              </div>
            </div>
            <div
              className={`savings-strip ${decision.potential_saving < 0 ? "loss" : ""}`}
            >
              <span>
                {decision.potential_saving >= 0 ? (
                  <ArrowDownRight size={17} />
                ) : (
                  <ArrowUpRight size={17} />
                )}
                Potential{" "}
                {decision.potential_saving >= 0 ? "saving" : "additional cost"}
              </span>
              <strong>
                {money(Math.abs(decision.potential_saving), true)} ·{" "}
                {Math.abs(decision.saving_percent).toFixed(1)}%
              </strong>
            </div>
            <div className="cost-lines">
              {(
                [
                  ["Linehaul freight", "freight_cost"],
                  ["Port charges", "port_charges"],
                  ["Port waiting", "waiting_cost"],
                  ["Additional weather idle", "idle_cost"],
                ] as const
              ).map(([label, key]) => (
                <div key={key}>
                  <span>{label}</span>
                  <strong>{money(decision.optimized_cost![key])}</strong>
                </div>
              ))}
              <div className="total">
                <span>All-in cost per tonne</span>
                <strong>
                  {money(decision.optimized_cost.cost_per_tonne, false, 2)}
                </strong>
              </div>
              <div>
                <span>
                  Sea fuel estimate <small>(included in linehaul)</small>
                </span>
                <span>{money(decision.optimized_cost.fuel_estimate)}</span>
              </div>
            </div>
            <p className="fine-print">{decision.optimized_cost.note}</p>
          </Panel>
          <Panel
            title="Turnaround & idle risk"
            subtitle="Time in motion, time at port, and avoidable delays."
            action={
              <Badge tone={decision.timing.idle_risk}>
                {decision.timing.idle_risk}
              </Badge>
            }
          >
            <div className="time-hero">
              <strong>
                {number(decision.timing.total_days, 1)}
                <span> days</span>
              </strong>
              <p>Estimated complete voyage</p>
            </div>
            <div className="time-track">
              {[
                {
                  label: "Loading",
                  days: decision.timing.loading_days,
                  color: "#7daacb",
                },
                {
                  label: "Sailing",
                  days: decision.timing.sailing_days,
                  color: "#327abc",
                },
                {
                  label: "Discharge",
                  days: decision.timing.discharge_days,
                  color: "#50a99b",
                },
                {
                  label: "Waiting",
                  days: decision.timing.port_waiting_days,
                  color: "#d9a74c",
                },
                {
                  label: "Weather idle",
                  days: decision.timing.potential_idle_days,
                  color: "#c66363",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  style={{ flexGrow: s.days, background: s.color }}
                  title={`${s.label}: ${s.days} days`}
                />
              ))}
            </div>
            <div className="cost-lines">
              {[
                ["Loading time", decision.timing.loading_days],
                ["Sailing time", decision.timing.sailing_days],
                ["Discharge time", decision.timing.discharge_days],
                ["Origin waiting", decision.timing.origin_waiting_days],
                [
                  "Destination waiting",
                  decision.timing.destination_waiting_days,
                ],
                [
                  "Additional idle / weather",
                  decision.timing.potential_idle_days,
                ],
              ].map(([label, value]) => (
                <div key={label}>
                  <span>{label}</span>
                  <strong>{number(Number(value), 1)} days</strong>
                </div>
              ))}
            </div>
            <Notice>
              Waiting and weather idle are separate estimates. Loading and
              discharge time = cargo tonnes ÷ handling tonnes per day.
            </Notice>
          </Panel>
        </div>
      )}
      <div className="two-col">
        <Panel
          title="Why this recommendation?"
          subtitle="Transparent, deterministic explanations from the decision engine."
          action={<Sparkles size={18} className="text-teal" />}
        >
          <div className="reasons">
            {decision.reasons.map((reason, i) => (
              <div key={i}>
                <span>{i + 1}</span>
                <p>{reason}</p>
              </div>
            ))}
          </div>
          {decision.score_breakdown.length > 0 && (
            <div className="score-list">
              {decision.score_breakdown.map((s) => (
                <div key={s.factor}>
                  <span>
                    {s.factor}
                    <small>{s.detail}</small>
                  </span>
                  <strong className={s.value >= 0 ? "positive" : "negative"}>
                    {s.value >= 0 ? "+" : ""}
                    {s.value}
                  </strong>
                </div>
              ))}
              <div className="total">
                <strong>Final opportunity score</strong>
                <strong>{decision.opportunity_score}/100</strong>
              </div>
            </div>
          )}
        </Panel>
        <Panel
          title="Voyage risk assessment"
          subtitle="Market, infrastructure and operational exposure."
          action={<Badge tone={decision.risk}>{decision.risk}</Badge>}
        >
          <div className="risk-list">
            {decision.risk_factors.map((r) => (
              <div key={r.name}>
                <div>
                  <span>{r.name}</span>
                  <strong>
                    {r.score}
                    <small>/100</small>
                  </strong>
                </div>
                <Progress
                  value={r.score}
                  tone={
                    r.score >= 60 ? "amber" : r.score >= 35 ? "blue" : "teal"
                  }
                />
                <p>{r.explanation}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
      {selected && (
        <Panel
          title="Port infrastructure compatibility"
          subtitle="Conservative full-laden dimensions · representative values, no tidal allowances."
          action={
            <Badge tone="low">
              <CheckCircle2 size={12} />
              Both ports compatible
            </Badge>
          }
        >
          <div className="compat-grid">
            {selected.compatibility.map((c) => (
              <div key={c.port}>
                <h3>
                  <AnchorIcon />
                  {c.port}
                </h3>
                {c.checks.map((check) => (
                  <div className="compat-check" key={check.parameter}>
                    <Term name={check.parameter} />
                    <span>
                      {check.vessel_value}m{" "}
                      <small>/ {check.port_limit}m limit</small>
                    </span>
                    <Check size={16} className="positive" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Panel>
      )}
      <Panel
        title="Alternative discharge options"
        subtitle="Ranked by estimated voyage cost. Savings compare the alternative at your requested start against the selected strategy."
      >
        {decision.alternatives.length ? (
          <div className="alternative-grid">
            {decision.alternatives.map((a) => (
              <div className="alternative" key={a.port}>
                <div>
                  <h3>{a.port}</h3>
                  <Badge tone="low">Compatible</Badge>
                </div>
                <p>
                  {a.vessel} · {number(a.distance_nm)} nm
                </p>
                <strong>{money(a.estimated_total_cost, true)}</strong>
                <div className="alternative-stats">
                  <span>
                    Linehaul rate<b>{money(a.freight_rate, false, 2)}/t</b>
                  </span>
                  <span>
                    Congestion<b>{a.congestion}/100</b>
                  </span>
                  <span>
                    Handling<b>{number(a.handling_rate)}t/day</b>
                  </span>
                  <span>
                    Destination wait<b>{a.waiting_days} days</b>
                  </span>
                </div>
                {a.saving_percent !== null && (
                  <p className={a.saving_percent > 0 ? "positive" : "muted"}>
                    {a.saving_percent > 0 ? "Save" : "Additional cost"}{" "}
                    {Math.abs(a.saving_percent).toFixed(1)}% ·{" "}
                    {a.turnaround_improvement_days! >= 0
                      ? "Reduce turnaround by"
                      : "Add to turnaround"}{" "}
                    {Math.abs(a.turnaround_improvement_days!).toFixed(1)} days
                  </p>
                )}
                <small>
                  Port switch requires inland logistics and cargo reception
                  review.
                </small>
              </div>
            ))}
          </div>
        ) : (
          <Empty
            title="No compatible alternative found"
            description="Change the loading port or cargo lot size to evaluate more options."
          />
        )}
      </Panel>
      {decision.alerts.length > 0 && (
        <Panel title="Decision warnings & opportunities">
          <div className="alert-list">
            {decision.alerts.map((a) => (
              <div key={a.id}>
                <TriangleAlert size={18} />
                <div>
                  <h3>
                    {a.title}
                    <Badge tone="neutral">Simulation</Badge>
                  </h3>
                  <p>{a.detail}</p>
                </div>
                <Badge tone={a.severity}>{a.severity}</Badge>
              </div>
            ))}
          </div>
        </Panel>
      )}
      {(!presentation || report) && (
        <Panel title="Assumptions & limitations" className="technical">
          <ul className="assumptions">
            {decision.assumptions.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </Panel>
      )}
      {reportOpen && (
        <div
          className="report-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Executive decision report"
        >
          <div className="report-toolbar no-print">
            <strong>Executive Decision Report</strong>
            <div>
              <button
                autoFocus
                className="button secondary"
                onClick={() => setReportOpen(false)}
              >
                Close report
              </button>
              <button className="button primary" onClick={print}>
                <Download size={16} />
                Print / Save PDF
              </button>
            </div>
          </div>
          <DecisionDetails decision={decision} report />
        </div>
      )}
    </div>
  );
}
function AnchorIcon() {
  return <Ship size={17} className="text-blue" />;
}
export function DecisionKpis({ decision }: { decision: Decision }) {
  const { money } = useSettings();
  return (
    <div className="metrics-grid four">
      <Metric
        label="Voyage estimate"
        value={money(decision.estimated_total_cost, true)}
        detail="Port and queue costs included"
        icon={<Ship size={17} />}
      />
      <Metric
        label="Potential saving"
        value={money(decision.potential_saving, true)}
        detail={`${decision.saving_percent.toFixed(1)}% vs current spot`}
        tone="teal"
      />
      <Metric
        label="Opportunity score"
        value={`${decision.opportunity_score}/100`}
        detail="Explainable decision score"
        icon={<Sparkles size={17} />}
      />
      <Metric
        label="Infrastructure"
        value={decision.feasible ? "Compatible" : "No fit"}
        detail={
          decision.feasible
            ? "Origin + destination verified"
            : "Change cargo or port"
        }
        icon={<ShieldCheck size={17} />}
        tone={decision.feasible ? "teal" : "amber"}
      />
    </div>
  );
}
