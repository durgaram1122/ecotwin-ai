# EcoTwin AI — Delivery Checklist

## 1. Interactive 3D campus and facility selection
- [ ] The application starts successfully and renders a real Three.js / React Three Fiber 3D campus rather than a flat illustration.
- [ ] The scene includes visually distinct academic/classroom buildings, computer lab, library, washrooms, corridors, canteen, lawns, trees, roads, paths, parking, seating, lamps and labels.
- [ ] Users can rotate with mouse drag, zoom, pan, reset the view, zoom in/out and focus the selected building; a loading state and WebGL fallback are present.
- [ ] Different buildings/facilities are clickable, hoverable and highlighted on selection, with normal/warning/critical states exposed by color and text labels.
- [ ] Selecting a facility opens that facility’s own record, not a generic popup, and the selected building remains highlighted while the panel is open.

## 2. Facility-specific image workflow and honest AI analysis
- [ ] The selected facility panel shows facility name/type/identifier, upload area, latest analysis, active alerts, sensor readings with real/simulated source labels, recommendations and previous analyses.
- [ ] JPEG, PNG and WebP files are validated for type and size; the UI supports drag/drop, browse, preview, filename/size, replace and remove without auto-analysis.
- [ ] Analyze Image validates the facility and file, calls a secure server endpoint, calls the configured vision-capable Gemini model, validates a structured response, saves the analysis and displays status, evidence, severity, meaningful confidence, recommendation, timestamp and original image.
- [ ] The analysis supports visible occupancy estimates, visible energy indicators, visible water wastage, visible waste accumulation and resource context only when evidence is adequate; it clearly states still-image and visibility limitations.
- [ ] Missing Gemini credentials, unavailable models, rate limits, invalid responses and network failures show meaningful errors and never become fabricated successful detections.
- [ ] Recommendations are based on validated findings and available sensor context; they do not claim hidden plumbing faults, actual power consumption or occupancy duration from a still image.

## 3. Persistence, APIs and database
- [ ] API routes exist for facilities/list and detail, image uploads, analyses and history, alerts, alert status, sensor readings, dashboard analytics, simulator, recommendations and reports.
- [ ] Requests validate input, file size, status codes and facility associations server-side; sensitive errors are not exposed.
- [ ] MySQL persistence uses `DATABASE_URL`, schema tables have keys/foreign keys/timestamps/indexes/constraints, and seed facilities are clearly marked as demonstration data.
- [ ] When managed database credentials are unavailable, the local development store is functional and documented without claiming production durability.
- [ ] Uploaded image metadata, analyses, alerts, readings and recommendations remain associated with the correct facility and refresh loads stored records whenever the configured database is available.

## 4. Sensors, alerts and facility status
- [ ] Simulation mode generates electricity kWh, water litres and optional occupancy/temperature readings with a clear SIMULATED DATA label, configurable thresholds, refresh/advance behavior, history and a test-alert action.
- [ ] Simulated and real readings are distinguishable; threshold violations create persistent alerts with alert ID, facility, category, severity, description, evidence source, timestamp, recommendation and Open/In Progress/Resolved status.
- [ ] Opening an alert shows its facility and evidence; resolving updates stored status and does not happen automatically from recommendation generation.
- [ ] Valid alerts update the related facility’s 3D status using green/amber/red plus accessible text labels.

## 5. Dashboard, analytics and AI Advisor
- [ ] The command center shows total facilities, analyzed facilities, active alerts, estimated energy/water and resolved issues from stored or explicitly labelled demo data.
- [ ] Recharts show energy and water trends, facility resource consumption, issue and severity distributions, recent analyses/alerts/actions and sustainability trends with relevant filters where applicable.
- [ ] The AI Advisor uses selected facility, saved analyses, sensor readings, open alerts, historical records and current thresholds for alert explanation, corrective action, facility summary, daily report, recurring issues and resource-reduction suggestions.
- [ ] Advisor failures show a clear service error and a useful non-AI fallback where appropriate; private keys and server configuration are never exposed.

## 6. UX, configuration and verification
- [ ] The UI uses the approved architectural command-center aesthetic, is responsive and accessible, and includes dashboard, campus, facility, results, alerts, analytics/reports, advisor and settings experiences.
- [ ] README and `.env.example` explain every variable actually used, Gemini setup, database setup/migrations, local fallback behavior, simulation honesty and run/build commands.
- [ ] The project includes `public/manus-routes.json`, an additive SQL schema/migration and no hardcoded credentials.
- [ ] `npm run lint` and `npm run build` complete without unresolved TypeScript, import or compilation errors.
