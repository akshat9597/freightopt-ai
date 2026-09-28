import { lazy, Suspense, useEffect, useState } from "react";
import { NavLink, Route, Routes, useLocation, Link } from "react-router-dom";
import {
  Activity,
  Anchor,
  ArrowLeftToLine,
  ArrowRightFromLine,
  Bell,
  BrainCircuit,
  ChevronRight,
  Compass,
  FlaskConical,
  Info,
  LayoutDashboard,
  Menu,
  Presentation,
  Route as RouteIcon,
  Ship,
  X,
} from "lucide-react";
import { useSettings } from "./components/Settings";
import { useApi } from "./hooks/useApi";
import type { Config } from "./types";
import { Loading } from "./components/UI";
import { ConnectionNotice } from "./components/ConnectionNotice";
import { fullDate } from "./utils/format";
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Optimizer = lazy(() => import("./pages/Optimizer"));
const Market = lazy(() => import("./pages/Market"));
const Ports = lazy(() => import("./pages/Ports"));
const RoutePage = lazy(() => import("./pages/Routes"));
const Simulation = lazy(() => import("./pages/Simulation"));
const Models = lazy(() => import("./pages/Models"));
const Alerts = lazy(() => import("./pages/Alerts"));
const About = lazy(() => import("./pages/About"));
const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/optimizer", label: "Voyage Optimizer", icon: Compass },
  { to: "/market", label: "Market Intelligence", icon: Activity },
  { to: "/ports", label: "Port Intelligence", icon: Anchor },
  { to: "/routes", label: "Routes", icon: RouteIcon },
  { to: "/simulation", label: "Simulation Lab", icon: FlaskConical },
  { to: "/models", label: "Model Analytics", icon: BrainCircuit },
  { to: "/alerts", label: "Alerts", icon: Bell },
  { to: "/about", label: "About", icon: Info },
];
export default function App() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const {
    currency,
    setCurrency,
    presentation,
    setPresentation,
    setExchange,
    exchange,
  } = useSettings();
  const config = useApi<Config>("/config");
  const location = useLocation();
  const title =
    nav.find((n) => n.to === location.pathname)?.label || "Not found";
  useEffect(() => {
    if (config.data) setExchange(config.data.usd_inr);
  }, [config.data, setExchange]);
  useEffect(() => {
    setMobile(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);
  return (
    <div
      className={`app-shell ${collapsed ? "collapsed" : ""} ${presentation ? "presentation" : ""}`}
    >
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      {mobile && (
        <button
          className="mobile-scrim"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <aside className={`sidebar ${mobile ? "mobile-open" : ""}`}>
        <Link to="/" className="brand">
          <span className="brand-icon">
            <Ship size={27} />
          </span>
          <span>
            <strong>
              FreightOpt <em>AI</em>
            </strong>
            <small>CHARTERING INTELLIGENCE</small>
          </span>
        </Link>
        <div className="nav-label">WORKSPACE</div>
        <nav aria-label="Main navigation">
          {nav.map((n, i) => (
            <NavLink
              end={n.to === "/"}
              to={n.to}
              key={n.to}
              title={collapsed ? n.label : undefined}
              className={({ isActive }) =>
                `${isActive ? "active" : ""} ${i === 6 ? "nav-divider" : ""}`
              }
            >
              <n.icon size={19} />
              <span>{n.label}</span>
              {n.to === "/optimizer" && <small>AI</small>}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="demo-card">
            <span className="status-dot" />
            <strong>Demo environment</strong>
            <p>
              Local data. Real calculations.
              <br />
              No external API required.
            </p>
          </div>
          <div className="sidebar-user">
            <div className="avatar">CM</div>
            <span>
              <strong>Chartering Manager</strong>
              <small>SIH26006 · Demo workspace</small>
            </span>
          </div>
          <button
            className="collapse-button"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <ArrowRightFromLine size={17} />
            ) : (
              <>
                <ArrowLeftToLine size={17} />
                <span>Collapse sidebar</span>
              </>
            )}
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label={mobile ? "Close navigation" : "Open navigation"}
              onClick={() => setMobile(!mobile)}
            >
              {mobile ? <X size={20} /> : <Menu size={20} />}
            </button>
            <span>Workspace</span>
            <ChevronRight size={13} />
            <strong>{title}</strong>
          </div>
          <div className="topbar-actions">
            <span className="demo-date">
              {config.data ? fullDate(config.data.as_of) : "Demo snapshot"}
            </span>
            <div
              className="currency-control"
              title={`Demo conversion: 1 USD = ${exchange} INR. Not live.`}
            >
              {(["USD", "INR"] as const).map((c) => (
                <button
                  key={c}
                  className={currency === c ? "active" : ""}
                  onClick={() => setCurrency(c)}
                  aria-pressed={currency === c}
                >
                  {c}
                </button>
              ))}
            </div>
            <button
              className={`presentation-toggle ${presentation ? "active" : ""}`}
              aria-label="Presentation Mode"
              aria-pressed={presentation}
              onClick={() => setPresentation(!presentation)}
              title="Simplify the dashboard for a 2–3 minute hackathon demo"
            >
              <Presentation size={16} />
              <span>Presentation Mode</span>
              <i />
            </button>
            <Link
              to="/alerts"
              className="notification-button"
              aria-label="Open alerts"
            >
              <Bell size={19} />
              <i />
            </Link>
            <div className="avatar small">CM</div>
          </div>
        </header>
        <main id="main-content">
          <ConnectionNotice />
          <div className="environment-line">
            <span>
              <span className="status-dot" />
              DEMO WORKSPACE
            </span>
            <span>Synthetic data · scenario-based intelligence</span>
          </div>
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/optimizer" element={<Optimizer />} />
              <Route path="/market" element={<Market />} />
              <Route path="/ports" element={<Ports />} />
              <Route path="/routes" element={<RoutePage />} />
              <Route path="/simulation" element={<Simulation />} />
              <Route path="/models" element={<Models />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/about" element={<About />} />
              <Route
                path="*"
                element={
                  <div className="state">
                    <h1>Page not found</h1>
                    <Link className="button primary" to="/">
                      Return to dashboard
                    </Link>
                  </div>
                }
              />
            </Routes>
          </Suspense>
          <footer className="disclaimer">
            <Info size={15} />
            <p>
              {config.data?.disclaimer ||
                "Demo environment: Freight, port, congestion and market values shown in this prototype may include synthetic or representative data. Production deployment should integrate validated data from approved maritime, port and market-data providers."}
            </p>
            <span>FREIGHTOPT AI · SIH26006</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
