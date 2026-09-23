import { BrainCircuit, Database, GitBranch } from "lucide-react";
import type { Metrics } from "../types";
import { useApi } from "../hooks/useApi";
import {
  Badge,
  ErrorState,
  Loading,
  Metric,
  Notice,
  PageTitle,
  Panel,
} from "../components/UI";
import { AccuracyChart, Bars } from "../components/Charts";
import { number } from "../utils/format";
export default function Models() {
  const { data, error, loading, retry } = useApi<Metrics>("/model/metrics");
  if (loading) return <Loading />;
  if (error || !data) return <ErrorState message={error} retry={retry} />;
  return (
    <>
      <PageTitle
        eyebrow="MODEL ANALYTICS"
        title="Intelligence you can inspect."
        description="Real training runs, held-out accuracy and feature importance on synthetic freight data."
        action={
          <Badge tone="low">
            <BrainCircuit size={13} />
            {data.selected_model}
          </Badge>
        }
      />
      <div className="metrics-grid six">
        <Metric
          label="Training records"
          value={number(data.training_records)}
          detail="First 70% · chronological"
          icon={<Database size={16} />}
        />
        <Metric
          label="Validation records"
          value={number(data.validation_records)}
          detail="Next 15% · model selection"
          icon={<GitBranch size={16} />}
        />
        <Metric
          label="Testing records"
          value={number(data.testing_records)}
          detail="Final 15% · untouched split"
        />
        <Metric
          label="MAE"
          value={`$${data.metrics.mae}`}
          detail="Mean absolute error · USD/t"
          tone="teal"
        />
        <Metric
          label="RMSE"
          value={`$${data.metrics.rmse}`}
          detail="Root mean squared error · USD/t"
          tone="teal"
        />
        <Metric
          label="R²"
          value={data.metrics.r2.toFixed(4)}
          detail="Held-out explained variance"
          tone="teal"
        />
      </div>
      <Notice>{data.evaluation_note}</Notice>
      <div className="two-col">
        <Panel
          title="What drives the forecast?"
          subtitle="Normalized permutation importance · validation MAE decrease"
        >
          <Bars
            data={data.feature_importance
              .slice(0, 10)
              .map((f) => ({
                name: f.feature
                  .replaceAll("_", " ")
                  .replace("port congestion destination", "dest. congestion")
                  .replace("cargo quantity tonnes", "cargo quantity"),
                value: f.importance,
              }))}
            horizontal
            height={370}
          />
        </Panel>
        <Panel
          title="Held-out predictions"
          subtitle="Actual vs predicted on sampled test voyages"
        >
          <AccuracyChart data={data.predictions} />
          <div className="model-note">
            <BrainCircuit size={19} />
            <p>
              Production model refit on{" "}
              <strong>{number(data.production_training_records)}</strong>{" "}
              observations after evaluation. Test metrics belong to the earlier
              held-out evaluation model.
            </p>
          </div>
        </Panel>
      </div>
      <Panel
        title="Model comparison"
        subtitle="Winner selected using validation RMSE, not test results."
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Model</th>
                <th>Validation RMSE</th>
                <th>Test MAE</th>
                <th>Test RMSE</th>
                <th>Test R²</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.models.map((m) => (
                <tr
                  className={
                    m.model === data.selected_model ? "selected-row" : ""
                  }
                  key={m.model}
                >
                  <td>
                    <strong>{m.model}</strong>
                  </td>
                  <td>${m.validation.rmse}/t</td>
                  <td>${m.test.mae}/t</td>
                  <td>${m.test.rmse}/t</td>
                  <td>{m.test.r2}</td>
                  <td>
                    <Badge
                      tone={m.model === data.selected_model ? "low" : "neutral"}
                    >
                      {m.model === data.selected_model
                        ? "Selected"
                        : "Comparison"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel title="A reproducible forecasting pipeline">
        <div className="pipeline">
          {[
            "7,305 synthetic observations",
            "Clean + date features",
            "Strictly shifted market lags",
            "70 / 15 / 15 date split",
            "Train three regressors",
            "Select by validation RMSE",
            "Held-out evaluation",
            "Refit + save artifacts",
          ].map((s, i) => (
            <div key={s}>
              <span>{String(i + 1).padStart(2, "0")}</span>
              <strong>{s}</strong>
            </div>
          ))}
        </div>
        <p className="fine-print">
          Data: {data.data_start} to {data.data_end}. Training ends before{" "}
          {data.train_end}; test begins {data.test_start}. No target or
          total-cost columns are used as predictors. Categorical encoding,
          imputation and scaling are fitted only on the training split during
          evaluation.
        </p>
      </Panel>
    </>
  );
}
