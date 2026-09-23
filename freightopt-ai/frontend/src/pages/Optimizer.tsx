import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Compass, FileCheck2 } from "lucide-react";
import type { Config, Decision, Port, Voyage } from "../types";
import { useApi } from "../hooks/useApi";
import { optimizeVoyage, errorMessage } from "../services/api";
import {
  DecisionDetails,
  DecisionKpis,
  Recommendation,
} from "../components/DecisionView";
import { VoyageForm } from "../components/VoyageForm";
import {
  Empty,
  ErrorState,
  Loading,
  Notice,
  PageTitle,
  Panel,
} from "../components/UI";
import { addDays } from "../utils/format";
const initial: Voyage = {
  cargo_type: "Coking Coal",
  cargo_quantity: 70000,
  origin_country: "Australia",
  origin_port: "Newcastle",
  destination_port: "Gangavaram",
  start_date: "2026-09-20",
  contract_type: "Short-Term",
  contract_duration_days: 45,
};
export default function Optimizer() {
  const config = useApi<Config>("/config");
  const ports = useApi<Port[]>("/ports");
  const [search] = useSearchParams();
  const [value, setValue] = useState<Voyage>(initial);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const initialized = useRef(false);
  const run = async (v: Voyage) => {
    setBusy(true);
    setError("");
    setDecision(null);
    try {
      setDecision(await optimizeVoyage(v));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    if (config.data && !initialized.current) {
      initialized.current = true;
      const demo = { ...initial, start_date: addDays(config.data.as_of, 7) };
      setValue(demo);
      if (search.get("demo") === "1") void run(demo);
    }
  }, [config.data, search]);
  if (config.loading || ports.loading) return <Loading />;
  if (config.error || ports.error || !config.data || !ports.data)
    return (
      <ErrorState
        message={config.error || ports.error}
        retry={() => {
          config.retry();
          ports.retry();
        }}
      />
    );
  const demo = () => {
    const v = { ...initial, start_date: addDays(config.data!.as_of, 7) };
    setValue(v);
    void run(v);
  };
  const dirty =
    decision && JSON.stringify(value) !== JSON.stringify(decision.voyage);
  return (
    <>
      <PageTitle
        eyebrow="AI DECISION CENTER"
        title="Voyage Optimizer"
        description="Turn your cargo requirement into a confident chartering decision."
        action={
          <span className="page-tag">
            <Compass size={16} />
            Forecast → Compare → Optimize
          </span>
        }
      />
      <div className="optimizer-layout">
        <Panel className="form-panel">
          <VoyageForm
            value={value}
            onChange={setValue}
            ports={ports.data}
            config={config.data}
            onSubmit={() => void run(value)}
            onDemo={demo}
            busy={busy}
          />
        </Panel>
        <div className="optimizer-result" aria-live="polite">
          {busy ? (
            <Panel>
              <Loading label="Evaluating freight, vessels and port constraints…" />
            </Panel>
          ) : error ? (
            <Panel>
              <ErrorState message={error} retry={() => void run(value)} />
            </Panel>
          ) : decision ? (
            <>
              {dirty && (
                <Notice>
                  Inputs have changed. The report below reflects the last
                  analyzed voyage; run optimization to update it.
                </Notice>
              )}
              <Recommendation decision={decision} />
              <div className="two-col optimizer-mini">
                <Panel title="Infrastructure first">
                  <FileCheck2 size={24} className="text-teal" />
                  <p className="body-copy">
                    {decision.feasible
                      ? "Both loading and discharge ports pass draft, LOA and beam constraints for the recommended vessel."
                      : "No vessel passes all constraints. Alternative compatible ports are listed below."}
                  </p>
                </Panel>
                <Panel title="Explainable by design">
                  <Compass size={24} className="text-blue" />
                  <p className="body-copy">
                    Every charter signal combines freight forecasts, market
                    uncertainty, congestion and cargo utilization.
                  </p>
                </Panel>
              </div>
              <Notice>{decision.reasons[0]}</Notice>
            </>
          ) : (
            <Panel className="optimizer-empty">
              <div className="workflow-symbol">
                <Compass size={38} />
              </div>
              <Empty
                title="Your next charter decision starts here"
                description="Enter a cargo requirement or load the demo scenario. The engine will forecast freight, evaluate all four vessel classes and identify compatible port options."
              />
              <div className="workflow-preview">
                {[
                  "Freight forecast",
                  "Charter timing",
                  "Vessel fit",
                  "Cost & risk",
                ].map((t, i) => (
                  <span key={t}>
                    <b>{i + 1}</b>
                    {t}
                  </span>
                ))}
              </div>
            </Panel>
          )}
        </div>
      </div>
      {decision && !busy && (
        <>
          <DecisionKpis decision={decision} />
          <DecisionDetails decision={decision} />
        </>
      )}
    </>
  );
}
