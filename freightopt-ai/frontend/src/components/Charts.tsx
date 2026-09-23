import { useState } from "react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ForecastPoint, HistoryPoint } from "../types";
import { shortDate } from "../utils/format";
import { useSettings } from "./Settings";
import { Panel } from "./UI";
const grid = "#edf1f5";
const axis = { fontSize: 11, fill: "#8291a1" };
export function ForecastChart({
  points,
  title = "Freight rate forecast",
  subtitle = "Newcastle → Gangavaram · Panamax · 70,000t",
  booking,
}: {
  points: ForecastPoint[];
  title?: string;
  subtitle?: string;
  booking?: string | null;
}) {
  const [horizon, setHorizon] = useState(90);
  const { currency, exchange } = useSettings();
  const factor = currency === "INR" ? exchange : 1;
  const data = points
    .slice(0, horizon + 1)
    .map((p) => ({
      ...p,
      rate: p.predicted_rate * factor,
      band: [p.lower_bound * factor, p.upper_bound * factor],
    }));
  return (
    <Panel
      title={title}
      subtitle={subtitle}
      action={
        <div className="segmented small">
          {[7, 30, 60, 90].map((n) => (
            <button
              key={n}
              aria-pressed={horizon === n}
              onClick={() => setHorizon(n)}
              className={horizon === n ? "active" : ""}
            >
              {n}D
            </button>
          ))}
        </div>
      }
    >
      <div className="chart-legend">
        <span>
          <i style={{ background: "#347bc5" }} />
          Model forecast
        </span>
        <span>
          <i style={{ background: "#dceafa" }} />
          Approximate residual range
        </span>
        <span className="ml-auto">{currency} / tonne</span>
      </div>
      <div className="chart">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 12, right: 14, left: -15, bottom: 2 }}
          >
            <CartesianGrid stroke={grid} vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={shortDate}
              tick={axis}
              tickLine={false}
              axisLine={false}
              minTickGap={40}
            />
            <YAxis
              domain={["auto", "auto"]}
              tick={axis}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => Number(v).toFixed(0)}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 10,
                border: "1px solid #e2e8f0",
                fontSize: 12,
              }}
              labelFormatter={(v) => shortDate(String(v))}
              formatter={(v, n) => [
                Array.isArray(v)
                  ? v.map((x) => Number(x).toFixed(2)).join(" – ")
                  : Number(v).toFixed(2),
                n,
              ]}
            />
            <Area
              name="Residual range"
              dataKey="band"
              type="monotone"
              stroke="none"
              fill="#dceafa"
              fillOpacity={0.9}
              isAnimationActive={false}
            />
            <Line
              name="Forecast"
              dataKey="rate"
              type="monotone"
              stroke="#2e77c2"
              strokeWidth={2.8}
              dot={false}
              isAnimationActive={false}
            />
            {booking && (
              <ReferenceLine
                x={booking}
                stroke="#158678"
                strokeDasharray="4 4"
                label={{
                  value: "Charter window",
                  fill: "#158678",
                  fontSize: 10,
                  position: "insideTopRight",
                }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-foot">
        <span>Scenario forecast · approximate 95% residual interval</span>
        <span>Not a calibrated probability</span>
      </div>
    </Panel>
  );
}
export function Bars({
  data,
  valueKey = "value",
  nameKey = "name",
  color = "#367bbe",
  height = 230,
  horizontal = false,
  monetary = false,
}: {
  data: Record<string, unknown>[];
  valueKey?: string;
  nameKey?: string;
  color?: string;
  height?: number;
  horizontal?: boolean;
  monetary?: boolean;
}) {
  const { currency, exchange } = useSettings();
  const mapped = monetary
    ? data.map((row) => ({
        ...row,
        [valueKey]: Number(row[valueKey]) * (currency === "INR" ? exchange : 1),
      }))
    : data;
  return (
    <div style={{ height, minWidth: 0 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={mapped}
          layout={horizontal ? "vertical" : "horizontal"}
          margin={{
            top: 10,
            right: 15,
            bottom: 5,
            left: horizontal ? 10 : -15,
          }}
        >
          <CartesianGrid
            stroke={grid}
            horizontal={!horizontal}
            vertical={horizontal}
          />
          {horizontal ? (
            <>
              <XAxis
                type="number"
                tick={axis}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey={nameKey}
                width={130}
                tick={axis}
                axisLine={false}
                tickLine={false}
              />
            </>
          ) : (
            <>
              <XAxis
                dataKey={nameKey}
                tick={{ ...axis, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval={0}
              />
              <YAxis tick={axis} axisLine={false} tickLine={false} />
            </>
          )}
          <Tooltip
            cursor={{ fill: "#f3f7fb" }}
            contentStyle={{ borderRadius: 10, fontSize: 12 }}
            formatter={(v) =>
              Number(v).toLocaleString("en-US", { maximumFractionDigits: 2 })
            }
          />
          <Bar
            dataKey={valueKey}
            radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
            maxBarSize={38}
          >
            {data.map((r, i) => (
              <Cell
                key={i}
                fill={typeof r.fill === "string" ? r.fill : color}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
export function HistoryChart({ data }: { data: HistoryPoint[] }) {
  const { currency, exchange } = useSettings();
  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data.map((r) => ({
            ...r,
            rate: r.rate * (currency === "INR" ? exchange : 1),
          }))}
        >
          <CartesianGrid stroke={grid} vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={shortDate}
            minTickGap={50}
            tick={axis}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={axis}
            domain={["auto", "auto"]}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            labelFormatter={(v) => shortDate(String(v))}
            formatter={(v) => Number(v).toFixed(2)}
          />
          <Line
            type="monotone"
            dataKey="rate"
            name={`Daily fleet average (${currency}/t)`}
            dot={false}
            stroke="#367bbe"
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
export function AccuracyChart({
  data,
}: {
  data: { date: string; actual: number; predicted: number }[];
}) {
  const { currency, exchange } = useSettings();
  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data.map((r) => ({
            ...r,
            actual: r.actual * (currency === "INR" ? exchange : 1),
            predicted: r.predicted * (currency === "INR" ? exchange : 1),
          }))}
        >
          <CartesianGrid stroke={grid} vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={shortDate}
            tick={axis}
            minTickGap={60}
          />
          <YAxis tick={axis} />
          <Tooltip formatter={(v) => Number(v).toFixed(2)} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          <Line
            name={`Actual (${currency}/t)`}
            dataKey="actual"
            stroke="#9aa9b8"
            dot={false}
            strokeWidth={2}
          />
          <Line
            name={`Predicted (${currency}/t)`}
            dataKey="predicted"
            stroke="#248777"
            dot={false}
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
