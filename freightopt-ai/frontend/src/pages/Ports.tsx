import { useState } from "react";
import { Anchor, MapPin, Search, X } from "lucide-react";
import { useApi } from "../hooks/useApi";
import type { Port } from "../types";
import {
  Badge,
  Empty,
  ErrorState,
  Loading,
  Notice,
  PageTitle,
  Panel,
  Progress,
  Term,
} from "../components/UI";
import { number } from "../utils/format";
import { useSettings } from "../components/Settings";
export default function Ports() {
  const { data, error, loading, retry } = useApi<Port[]>("/ports");
  const [selected, setSelected] = useState<Port | null>(null);
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState("India");
  const { money } = useSettings();
  if (loading) return <Loading />;
  if (error || !data) return <ErrorState message={error} retry={retry} />;
  const rows = data.filter(
    (p) =>
      (scope === "All" || p.country === scope) &&
      `${p.name} ${p.country} ${p.name === "Visakhapatnam" ? "Vizag" : ""}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <>
      <PageTitle
        eyebrow="PORT INTELLIGENCE"
        title="Know the port before you charter."
        description="Infrastructure constraints, cargo handling and congestion across your network."
      />
      <div className="toolbar">
        <div className="search-box">
          <Search size={17} />
          <input
            aria-label="Search ports"
            placeholder="Search ports or countries…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="segmented">
          <button
            className={scope === "India" ? "active" : ""}
            onClick={() => setScope("India")}
          >
            India’s East Coast
          </button>
          <button
            className={scope === "All" ? "active" : ""}
            onClick={() => setScope("All")}
          >
            All 21 ports
          </button>
        </div>
      </div>
      <div className="port-cards">
        {rows.map((p) => (
          <button
            key={p.name}
            className={`port-card ${selected?.name === p.name ? "active" : ""}`}
            onClick={() => setSelected(p)}
          >
            <div className="port-card-top">
              <span className="icon-box">
                <Anchor size={21} />
              </span>
              <Badge
                tone={
                  p.congestion_index >= 60
                    ? "high"
                    : p.congestion_index >= 35
                      ? "medium"
                      : "low"
                }
              >
                {p.congestion_index >= 60
                  ? "HIGH"
                  : p.congestion_index >= 35
                    ? "MEDIUM"
                    : "LOW"}{" "}
                risk
              </Badge>
            </div>
            <h2>
              {p.name === "Visakhapatnam" ? "Visakhapatnam / Vizag" : p.name}
            </h2>
            <p>
              <MapPin size={12} />
              {p.country} · {p.latitude.toFixed(2)}°, {p.longitude.toFixed(2)}°
            </p>
            <div className="port-card-stats">
              <div>
                <span>Max draft</span>
                <strong>{p.max_draft}m</strong>
              </div>
              <div>
                <span>Handling / day</span>
                <strong>{number(p.handling_rate / 1000, 1)}k t</strong>
              </div>
              <div>
                <span>Avg. waiting</span>
                <strong>{p.average_waiting_days}d</strong>
              </div>
            </div>
            <div className="port-congestion">
              <span>Congestion</span>
              <strong>{p.congestion_index}/100</strong>
            </div>
            <Progress
              value={p.congestion_index}
              tone={p.congestion_index >= 60 ? "amber" : "teal"}
            />
            <small>View infrastructure details →</small>
          </button>
        ))}
      </div>
      {!rows.length && (
        <Empty
          title="No matching ports"
          description="Try a different port name or choose all ports."
        />
      )}
      <Panel
        title="Port infrastructure master"
        subtitle={`${rows.length} representative ports · select a row for full details`}
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Port</th>
                <th>
                  <Term name="Draft" />
                </th>
                <th>
                  <Term name="LOA" />
                </th>
                <th>
                  <Term name="Beam" />
                </th>
                <th>Handling / day</th>
                <th>Waiting</th>
                <th>
                  <Term name="Port Congestion" />
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.name}>
                  <td>
                    <button
                      className="text-link"
                      onClick={() => setSelected(p)}
                    >
                      {p.name}
                    </button>
                  </td>
                  <td>{p.max_draft}m</td>
                  <td>{p.max_loa}m</td>
                  <td>{p.max_beam}m</td>
                  <td>{number(p.handling_rate)}t</td>
                  <td>{p.average_waiting_days}d</td>
                  <td>
                    <Badge tone={p.congestion_index >= 60 ? "high" : "low"}>
                      {p.congestion_index}/100
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <Notice>
        Demonstration data — replace with official port authority data for
        production.
      </Notice>
      {selected && (
        <div className="drawer-backdrop" onClick={() => setSelected(null)}>
          <section
            className="drawer"
            role="dialog"
            aria-modal="true"
            aria-label={`${selected.name} port details`}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") setSelected(null);
            }}
          >
            <button
              autoFocus
              className="icon-button drawer-close"
              aria-label="Close port details"
              onClick={() => setSelected(null)}
            >
              <X size={20} />
            </button>
            <span className="icon-box">
              <Anchor size={28} />
            </span>
            <div className="eyebrow">PORT PROFILE · DEMONSTRATION DATA</div>
            <h1>{selected.name}</h1>
            <p>
              {selected.country} · {selected.latitude}°, {selected.longitude}°
            </p>
            <div className="cost-lines">
              {[
                ["Maximum draft", `${selected.max_draft}m`],
                ["Maximum LOA", `${selected.max_loa}m`],
                ["Maximum beam", `${selected.max_beam}m`],
                [
                  "Cargo handling",
                  `${number(selected.handling_rate)} tonnes/day`,
                ],
                [
                  "Baseline turnaround",
                  `${selected.average_turnaround_days} days`,
                ],
                ["Baseline waiting", `${selected.average_waiting_days} days`],
                ["Congestion", `${selected.congestion_index}/100`],
                ["Estimated port charges", money(selected.port_charges_usd)],
              ].map(([label, val]) => (
                <div key={label}>
                  <span>{label}</span>
                  <strong>{val}</strong>
                </div>
              ))}
            </div>
            <Notice>
              These are representative values, not official limits. No tidal
              windows, berth-specific constraints, channel restrictions or
              lighterage are modeled.
            </Notice>
          </section>
        </div>
      )}
    </>
  );
}
