import type { ReactNode } from "react";
import {
  AlertCircle,
  ArrowUpRight,
  Info,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import { terms } from "../utils/format";
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return (
    <span className={`badge badge-${tone.toLowerCase().replaceAll(" ", "-")}`}>
      {children}
    </span>
  );
}
export function Term({ name }: { name: string }) {
  return (
    <span className="term" tabIndex={0} title={terms[name]}>
      {name}
      <Info size={12} />
      <span role="tooltip">{terms[name]}</span>
    </span>
  );
}
export function Panel({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      {title && (
        <div className="panel-heading">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
export function PageTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
export function Metric({
  label,
  value,
  detail,
  icon,
  tone = "blue",
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  icon?: ReactNode;
  tone?: string;
}) {
  return (
    <div className="metric">
      <div className="metric-top">
        <span>{label}</span>
        <span className={`metric-icon ${tone}`}>
          {icon || <ArrowUpRight size={17} />}
        </span>
      </div>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </div>
  );
}
export function Loading({
  label = "Preparing freight intelligence…",
}: {
  label?: string;
}) {
  return (
    <div className="state loading" role="status">
      <LoaderCircle className="spin" size={26} />
      <h3>{label}</h3>
      <p>Loading data from the local forecasting engine.</p>
    </div>
  );
}
export function ErrorState({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  return (
    <div className="state error" role="alert">
      <AlertCircle size={27} />
      <h3>Unable to load intelligence</h3>
      <p>{message}</p>
      {retry && (
        <button className="button secondary" onClick={retry}>
          <RefreshCw size={16} />
          Try again
        </button>
      )}
    </div>
  );
}
export function Empty({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="state">
      <Info size={25} />
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
export function Progress({
  value,
  tone = "blue",
}: {
  value: number;
  tone?: string;
}) {
  return (
    <div className={`progress ${tone}`}>
      <span style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}
export function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="notice">
      <Info size={16} />
      <p>{children}</p>
    </div>
  );
}
