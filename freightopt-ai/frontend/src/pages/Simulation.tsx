import { useEffect, useRef, useState } from "react";
import { FlaskConical, RotateCcw } from "lucide-react";
import type {
  Config,
  Decision,
  Market,
  Simulation as SimulationInput,
} from "../types";
import { useApi } from "../hooks/useApi";
import { simulateVoyage, errorMessage } from "../services/api";
import {
  DecisionDetails,
  DecisionKpis,
  Recommendation,
} from "../components/DecisionView";
import {
  ErrorState,
  Loading,
  Notice,
  PageTitle,
  Panel,
} from "../components/UI";
import { addDays, number } from "../utils/format";
const initial: SimulationInput = {
  cargo_type: "Coking Coal",
  cargo_quantity: 70000,
  origin_country: "Australia",
  origin_port: "Newcastle",
  destination_port: "Gangavaram",
  start_date: "2026-09-20",
  contract_type: "Short-Term",
  contract_duration_days: 45,
  fuel_price_usd: 610,
  baltic_index: 1740,
  destination_congestion: 26,
  weather: "normal",
};
export default function Simulation() {
  const config = useApi<Config>("/config");
  const market = useApi<Market>("/market/overview");
  const [value, setValue] = useState(initial);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [revision, setRevision] = useState(0);
  const baseline = useRef(initial);
  useEffect(() => {
    if (config.data && market.data && !ready) {
      baseline.current = {
        ...initial,
        start_date: addDays(config.data.as_of, 7),
        fuel_price_usd: market.data.fuel_price_usd,
        baltic_index: market.data.baltic_index,
      };
      setValue(baseline.current);
      setReady(true);
    }
  }, [config.data, market.data, ready]);
  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    setBusy(true);
    setError("");
    const timer = window.setTimeout(() => {
      simulateVoyage(value, controller.signal)
        .then((d) => {
          if (!controller.signal.aborted) setDecision(d);
        })
        .catch((e) => {
          if (!controller.signal.aborted) setError(errorMessage(e));
        })
        .finally(() => {
          if (!controller.signal.aborted) setBusy(false);
        });
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value, ready, revision]);
  if (config.loading || market.loading) return <Loading />;
  if (config.error || market.error || !config.data)
    return (
      <ErrorState
        message={config.error || market.error}
        retry={() => {
          config.retry();
          market.retry();
        }}
      />
    );
  const field = <K extends keyof SimulationInput>(
    k: K,
    v: SimulationInput[K],
  ) => setValue({ ...value, [k]: v });
  return (
    <>
      <PageTitle
        eyebrow="SIMULATION LAB"
        title="What changes your charter decision?"
        description="Stress-test a Newcastle → Gangavaram voyage. Results recalculate as you adjust the conditions."
        action={
          <button
            className="button secondary"
            onClick={() => setValue(baseline.current)}
          >
            <RotateCcw size={16} />
            Reset scenario
          </button>
        }
      />
      <Notice>
        Interactive simulation, not a live market feed. Fuel and index controls
        apply scenario shocks to the forecast path. Quantities remain a
        single-vessel requirement.
      </Notice>
      <div className="simulation-layout">
        <Panel
          title="Scenario controls"
          subtitle="Adjust a variable to recompute the analysis."
          action={<FlaskConical size={19} className="text-blue" />}
        >
          <div className="slider-list">
            {(
              [
                {
                  key: "fuel_price_usd",
                  label: "Bunker fuel price",
                  min: 200,
                  max: 1500,
                  step: 10,
                  unit: "USD / tonne",
                },
                {
                  key: "baltic_index",
                  label: "Market index",
                  min: 300,
                  max: 5000,
                  step: 20,
                  unit: "index points",
                },
                {
                  key: "destination_congestion",
                  label: "Destination congestion",
                  min: 0,
                  max: 100,
                  step: 1,
                  unit: "/ 100",
                },
                {
                  key: "cargo_quantity",
                  label: "Cargo quantity",
                  min: 1000,
                  max: 180000,
                  step: 1000,
                  unit: "tonnes",
                },
              ] as const
            ).map((s) => (
              <label key={s.key}>
                <div>
                  <span>{s.label}</span>
                  <strong>
                    {number(value[s.key])}
                    <small> {s.unit}</small>
                  </strong>
                </div>
                <input
                  aria-label={s.label}
                  type="range"
                  min={s.min}
                  max={s.max}
                  step={s.step}
                  value={value[s.key]}
                  onChange={(e) => field(s.key, Number(e.target.value))}
                />
                <div className="slider-ends">
                  <span>{number(s.min)}</span>
                  <span>{number(s.max)}</span>
                </div>
              </label>
            ))}
            <label>
              Charter date
              <input
                type="date"
                aria-label="Simulation charter date"
                min={config.data.as_of}
                max={addDays(config.data.as_of, 90)}
                value={value.start_date}
                onChange={(e) => {
                  if (e.target.value) field("start_date", e.target.value);
                }}
              />
            </label>
            <label>
              Weather scenario
              <select
                value={value.weather}
                onChange={(e) =>
                  field("weather", e.target.value as SimulationInput["weather"])
                }
              >
                {["normal", "rough weather", "cyclone risk", "high swell"].map(
                  (w) => (
                    <option key={w}>{w}</option>
                  ),
                )}
              </select>
            </label>
          </div>
          <div className="simulation-status" role="status">
            <span className={busy ? "status-dot amber-dot" : "status-dot"} />
            {busy ? "Recalculating scenario…" : "Scenario ready"}
          </div>
        </Panel>
        <div aria-live="polite">
          {error ? (
            <ErrorState
              message={error}
              retry={() => setRevision((r) => r + 1)}
            />
          ) : decision ? (
            <div className={busy ? "updating" : ""}>
              <Recommendation decision={decision} />
              <div className="scenario-takeaway">
                <h3>What this scenario tells you</h3>
                <p>{decision.reasons[0]}</p>
                <p>
                  {decision.reasons[2] ||
                    "Change the cargo lot size to restore vessel feasibility."}
                </p>
                {busy && (
                  <p>
                    Updating — the results above reflect the previous scenario.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <Loading label="Calculating your baseline scenario…" />
          )}
        </div>
      </div>
      {decision && !error && (
        <div className={busy ? "updating" : ""}>
          <DecisionKpis decision={decision} />
          <DecisionDetails decision={decision} />
        </div>
      )}
    </>
  );
}
