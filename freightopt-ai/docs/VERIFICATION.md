# FreightOpt AI verification

Verified locally on 13 September 2026.

## Automated checks

- **23 backend tests passed**. Includes API validation, forecast dates/bounds/variation, port constraints and exact-limit boundaries, vessel capacity/ranking, voyage cost arithmetic, opportunity-score totals, correct uncertainty at the final booking date, infeasible-port handling and alternatives, simulation sensitivity, database catalogs and leakage-resistant feature shifting.
- **63 additional scenario checks** across seven cargo quantities, three loading/discharge pairs and three dates. No recommended-vessel/ranking or additive-score inconsistencies found in that sweep.
- Frontend **TypeScript + production Vite build passed**.
- Frontend **ESLint passed**.
- Python **Ruff F checks passed**; Python and frontend sources formatted.
- Dependencies installed from public package registries; no paid APIs used.
- Two non-failing deprecation warnings originate from the installed Starlette/httpx test-client combination. They do not affect the passing tests or normal API startup.

## Startup and API

- Empty-workspace initial test startup generated 7,305 history records, trained three models, saved artifacts, seeded all seven SQLAlchemy tables, and served API responses.
- Subsequent API startup reused artifacts successfully.
- API running on loopback port **8001**; port 8000 belongs to a separate existing application and was left undisturbed.
- Frontend running on loopback port **5173**, with a Vite proxy to the API.
- Synthetic history: 1,461 days; 21 ports, 4 vessel types, 7 cargo types and 98 route distances.

## Browser checks

Verified the actual React pages against FastAPI:

- Dashboard forecasts, cost/port/vessel charts and held-out predictions.
- One-click demo: Newcastle → Gangavaram, Coking Coal, 70,000 tonnes, Short-Term / 45 days, 20 September 2026 start. Panamax selected; Handysize/Supramax rejected for capacity.
- Haldia scenario: no compatible full-laden vessel; no invented total cost; compatible alternative Indian ports shown.
- Simulation changes trigger API requests and replace results. Cyclone risk adds four idle days, raises cost and triggers HIGH-RISK MARKET.
- USD/INR conversion changes monetary cards and charts.
- Presentation Mode shows the six-step decision story and hides secondary dashboard detail.
- Port detail drawer contains the representative dimensions and operational values.
- Market, routes, model analytics, alert review state and About/data-source pages loaded.
- Executive report preview contains the selected voyage, recommendation, forecast, vessel/port checks, costs, risks, alternatives and assumptions.
- Desktop default viewport and 390px phone-width checks. Main page width equals viewport width; wide comparison tables scroll inside their containers. Mobile navigation opens and navigates correctly.
- No browser JavaScript errors were recorded during these page/interaction checks.

Screenshots: `docs/screenshots/dashboard.png`, `optimizer.png`, `simulation.png`, `model-analytics.png`.

## Model result

Selected model: **Gradient Boosting** (selected on validation RMSE).

- Training: 5,110 records
- Validation: 1,095 records
- Testing: 1,100 records
- MAE: 1.225 USD/tonne
- RMSE: 1.534 USD/tonne
- R²: 0.9731

These are synthetic-data conditional held-out scores, not real-market or 90-day forecast validation. Production refit uses all 7,305 records after evaluation. Confidence bands and the displayed confidence score are heuristic.

## Scope limits

All market/port/weather values are synthetic or representative. No official port specifications, live vessel availability, Baltic feed, AIS or external weather service is claimed. Full-laden port checks are conservative. Contract pricing is a demo per-voyage procurement adjustment, not time-charter hire or multi-voyage scheduling. Alternative-port comparison excludes inland logistics. Browser printing uses the host browser's native print/PDF facility; an embedded browser may require opening the same URL in Chrome or Safari.
