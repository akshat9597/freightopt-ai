import { ArrowRight, CheckCircle2, Database, Ship } from "lucide-react";
import { useApi } from "../hooks/useApi";
import type { Config } from "../types";
import {
  Badge,
  ErrorState,
  Loading,
  Notice,
  PageTitle,
  Panel,
  Term,
} from "../components/UI";
import { terms } from "../utils/format";
export default function About() {
  const { data, error, loading, retry } = useApi<Config>("/config");
  if (loading) return <Loading />;
  if (error || !data) return <ErrorState message={error} retry={retry} />;
  return (
    <>
      <PageTitle
        eyebrow="SIH26006 · SMART INDIA HACKATHON"
        title="FreightOpt AI"
        description="AI-Powered Freight Forecasting & Vessel Chartering Intelligence"
        action={
          <span className="icon-box">
            <Ship size={25} />
          </span>
        }
      />
      <Panel title="From reactive chartering to informed procurement">
        <p className="body-copy">
          Built for chartering managers, bulk procurement teams, logistics
          managers, port operators and supply-chain decision makers moving cargo
          from overseas origins to India’s East Coast.
        </p>
        <div className="flow-comparison">
          <div>
            <h3>Current method</h3>
            {[
              "Daily market enquiries",
              "Reactive spot chartering",
              "High price uncertainty",
              "Potential vessel mismatch",
              "Idle time",
              "Higher logistics cost",
            ].map((s) => (
              <div key={s}>
                {s}
                <ArrowRight size={14} />
              </div>
            ))}
          </div>
          <div className="improved-flow">
            <h3>FreightOpt AI</h3>
            {[
              "Cargo requirement",
              "Freight forecast",
              "Market timing analysis",
              "Port constraint analysis",
              "Vessel optimization",
              "Cost & risk analysis",
              "Optimal charter decision",
            ].map((s) => (
              <div key={s}>
                <CheckCircle2 size={15} />
                {s}
              </div>
            ))}
          </div>
        </div>
      </Panel>
      <Panel
        title="Data sources"
        subtitle="Provider adapters can replace demo services without changing the decision workflow."
      >
        <div className="data-source-list">
          {data.data_sources.map((s) => (
            <div key={s.name}>
              <Database size={21} />
              <div>
                <h3>{s.name}</h3>
                <p>{s.description}</p>
              </div>
              <Badge tone={s.status === "Connected" ? "low" : "neutral"}>
                {s.status}
              </Badge>
            </div>
          ))}
        </div>
      </Panel>
      <div className="two-col">
        <Panel title="Working architecture">
          <div className="architecture-flow">
            {[
              "React + TypeScript dashboard",
              "FastAPI · validated REST requests",
              "Freight model + market timing engine",
              "Vessel + port constraint engines",
              "Cost + idle time + risk analysis",
              "SQLAlchemy + SQLite + CSV data",
            ].map((s, i) => (
              <div key={s}>
                <span>{i + 1}</span>
                {s}
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Maritime glossary">
          <dl className="glossary">
            {Object.entries(terms).map(([term, definition]) => (
              <div key={term}>
                <dt>
                  <Term name={term} />
                </dt>
                <dd>{definition}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      </div>
      <Notice>{data.disclaimer}</Notice>
      <Notice>
        {data.port_disclaimer} USD/INR conversion is a configurable demo value
        of {data.usd_inr}; it is not a live exchange rate.
      </Notice>
    </>
  );
}
