import { Anchor, ArrowRight, FlaskConical, LoaderCircle } from "lucide-react";
import type { Config, Port, Voyage } from "../types";
import { addDays } from "../utils/format";
import { Term } from "./UI";
export function VoyageForm({
  value,
  onChange,
  ports,
  config,
  onSubmit,
  onDemo,
  busy,
}: {
  value: Voyage;
  onChange: (v: Voyage) => void;
  ports: Port[];
  config: Config;
  onSubmit: () => void;
  onDemo: () => void;
  busy: boolean;
}) {
  const field = <K extends keyof Voyage>(key: K, val: Voyage[K]) =>
    onChange({ ...value, [key]: val });
  const country = (countryName: string) => {
    const origin = ports.find((p) => p.country === countryName);
    onChange({
      ...value,
      origin_country: countryName,
      origin_port: origin?.name || "",
    });
  };
  return (
    <form
      className="voyage-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div className="form-heading">
        <span className="icon-box">
          <Anchor size={20} />
        </span>
        <div>
          <h2>Voyage parameters</h2>
          <p>Define your cargo requirement</p>
        </div>
      </div>
      <label>
        Cargo type
        <select
          value={value.cargo_type}
          onChange={(e) => field("cargo_type", e.target.value)}
        >
          {config.cargos.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      <label>
        Cargo quantity <span>tonnes</span>
        <input
          required
          type="number"
          min={1000}
          max={180000}
          step={100}
          value={value.cargo_quantity}
          onChange={(e) => field("cargo_quantity", Number(e.target.value))}
        />
      </label>
      <label>
        Origin country
        <select
          value={value.origin_country}
          onChange={(e) => country(e.target.value)}
        >
          {config.countries.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      <label>
        Loading port
        <select
          value={value.origin_port}
          onChange={(e) => field("origin_port", e.target.value)}
        >
          {ports
            .filter((p) => p.country === value.origin_country)
            .map((p) => (
              <option key={p.name}>{p.name}</option>
            ))}
        </select>
      </label>
      <label>
        Discharge port
        <select
          value={value.destination_port}
          onChange={(e) => field("destination_port", e.target.value)}
        >
          {ports
            .filter((p) => p.country === "India")
            .map((p) => (
              <option key={p.name} value={p.name}>
                {p.name === "Visakhapatnam" ? "Visakhapatnam / Vizag" : p.name}
              </option>
            ))}
        </select>
      </label>
      <label>
        Desired charter start
        <input
          required
          type="date"
          min={config.as_of}
          max={addDays(config.as_of, 90)}
          value={value.start_date}
          onChange={(e) => field("start_date", e.target.value)}
        />
      </label>
      <div className="form-pair">
        <label>
          Contract type
          <select
            value={value.contract_type}
            onChange={(e) =>
              field("contract_type", e.target.value as Voyage["contract_type"])
            }
          >
            {["Spot", "Short-Term", "Medium-Term", "Multi-Voyage"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          Duration <span>days</span>
          <input
            required
            type="number"
            min={1}
            max={365}
            value={value.contract_duration_days}
            onChange={(e) =>
              field("contract_duration_days", Number(e.target.value))
            }
          />
        </label>
      </div>
      <div className="form-help">
        <Term name="Spot Charter" />
        <Term name="Time Charter" />
      </div>
      <button className="button primary full" disabled={busy} type="submit">
        {busy ? (
          <LoaderCircle size={17} className="spin" />
        ) : (
          <ArrowRight size={17} />
        )}{" "}
        {busy ? "Analyzing voyage…" : "Run AI Optimization"}
      </button>
      <button
        type="button"
        className="button secondary full"
        disabled={busy}
        onClick={onDemo}
      >
        <FlaskConical size={16} />
        Load Demo Scenario
      </button>
      <p className="fine-print">
        Flexible booking: up to 14 days after your desired start, within the
        90-day demo horizon.
      </p>
    </form>
  );
}
