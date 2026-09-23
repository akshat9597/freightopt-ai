import { useState } from "react";
import { Bell, CheckCheck, TriangleAlert } from "lucide-react";
import type { Alert } from "../types";
import { useApi } from "../hooks/useApi";
import {
  Badge,
  Empty,
  ErrorState,
  Loading,
  Notice,
  PageTitle,
  Panel,
} from "../components/UI";
export default function Alerts() {
  const { data, error, loading, retry } = useApi<Alert[]>("/alerts");
  const [filter, setFilter] = useState("All");
  const [ack, setAck] = useState<string[]>(() => {
    try {
      return JSON.parse(sessionStorage.getItem("freightopt-ack") || "[]");
    } catch {
      return [];
    }
  });
  if (loading) return <Loading />;
  if (error || !data) return <ErrorState message={error} retry={retry} />;
  const rows = data.filter(
    (a) =>
      filter === "All" ||
      (filter === "Unreviewed" ? !ack.includes(a.id) : a.severity === filter),
  );
  const acknowledge = (id: string) => {
    const next = ack.includes(id) ? ack.filter((x) => x !== id) : [...ack, id];
    setAck(next);
    sessionStorage.setItem("freightopt-ack", JSON.stringify(next));
  };
  return (
    <>
      <PageTitle
        eyebrow="ALERT CENTER"
        title="Stay ahead of the next disruption."
        description="Market signals, port congestion and vessel compatibility advisories."
        action={
          <Badge tone="medium">
            <Bell size={13} />
            {data.filter((a) => !ack.includes(a.id)).length} unreviewed
          </Badge>
        }
      />
      <Notice>
        All alerts are labelled Simulation. No real-time AIS, broker
        availability, Baltic Exchange or port-congestion feeds are connected.
      </Notice>
      <div className="toolbar">
        <div className="segmented">
          {["All", "Unreviewed", "CRITICAL", "HIGH", "MEDIUM"].map((f) => (
            <button
              key={f}
              className={filter === f ? "active" : ""}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      <Panel>
        <div className="alert-center-list">
          {rows.map((a) => (
            <article
              key={a.id}
              className={ack.includes(a.id) ? "acknowledged" : ""}
            >
              <div className={`alert-icon ${a.severity.toLowerCase()}`}>
                <TriangleAlert size={21} />
              </div>
              <div>
                <div className="alert-heading">
                  <h2>{a.title}</h2>
                  <Badge tone={a.severity}>{a.severity}</Badge>
                  <Badge>Simulation</Badge>
                </div>
                <p>{a.detail}</p>
                <small>
                  {ack.includes(a.id)
                    ? "Reviewed in this browser session"
                    : "Chartering intelligence · demo advisory"}
                </small>
              </div>
              <button
                className="button secondary small-button"
                onClick={() => acknowledge(a.id)}
              >
                <CheckCheck size={15} />
                {ack.includes(a.id) ? "Undo review" : "Mark reviewed"}
              </button>
            </article>
          ))}
        </div>
        {!rows.length && (
          <Empty
            title="You’re all caught up"
            description="No alerts match this filter. Choose All to review the full simulation feed."
          />
        )}
      </Panel>
    </>
  );
}
