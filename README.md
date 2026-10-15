# EcoTwin AI — Smart Sustainable Campus Digital Twin

EcoTwin AI is a full-stack hackathon application for operating a modern Indian college campus as a spatial, evidence-led sustainability system. The 3D digital twin is the primary surface: click classrooms, labs, the library, washrooms, corridors, canteen, courtyard or mobility court to open a facility-specific evidence drawer.

## What is implemented

The app combines a React Three Fiber campus, facility-specific image upload, server-side Gemini vision integration, persisted image analyses, simulated sensors, threshold alerts, analytics, and a context-aware AI Advisor. The UI explicitly distinguishes **AI-derived evidence**, **simulated sensor data**, and records saved to the configured database.

The analysis workflow is deliberately honest: the server validates JPEG/PNG/WebP files, checks the facility association, sends the image to the configured Gemini model only after the operator clicks **Analyze image**, validates the structured response, saves the result and creates high-severity alerts only when warranted. If Gemini is not configured or fails, the API returns an error and does not save a fabricated success.

## Run locally

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open `http://localhost:3000`. The app works without external credentials using `data/ecotwin.json` as a local development store. This fallback is useful for a demo and survives browser refreshes in the same development workspace; it is not a claim of production durability.

Use `pnpm build` to compile the production bundle. The project is configured to listen on `0.0.0.0:3000` for managed Preview.

## Gemini vision and Advisor

The server calls Google's official `generateContent` REST endpoint. Uploaded JPEG, PNG and WebP bytes are validated on the server, sent as Gemini `inline_data`, and parsed with a strict Zod schema before anything is saved. The default model is the tested multimodal `gemini-3.1-flash-lite`; you can override it only with a model returned by the Gemini Models API that supports `generateContent` for your key.

For local development, set these variables in `.env.local`:

```env
GEMINI_API_KEY=your_server_only_key
GEMINI_MODEL=gemini-3.1-flash-lite
```

For a managed Manus project, open the project's **Secrets / environment variables** configuration and add `GEMINI_API_KEY` as a server-only secret. Add `GEMINI_MODEL` as a non-public server variable, or use the default shown above. If the Google Gemini connector is used instead, enable the **Google Gemini** connector in Manus integrations and make its server-side key available to the project runtime. Do not use `NEXT_PUBLIC_GEMINI_API_KEY`, paste the key into the browser, or commit it to `.env.example`.

The Settings screen reports only whether a server key exists and which model name is selected. It never returns the key. Missing keys, invalid keys, unavailable models, quota errors, timeouts, network failures and malformed responses return honest error states and never create fake analyses.

## Managed MySQL persistence

When `DATABASE_URL` is available, the app uses MySQL through `mysql2` and runs additive `CREATE TABLE IF NOT EXISTS` setup on first access. The schema is also committed at `db/schema.sql` and covers:

- `facilities`
- `uploaded_images`
- `image_analyses`
- `sensor_readings`
- `sustainability_alerts`
- `recommendations`
- `sustainability_reports`

Managed development and published runtime should use the same database scope. Do not run destructive DDL against it without reviewing the impact. The application seeds demonstration facilities only when the facilities table is empty; all seeded readings are marked `source: simulated` and facilities are marked as demo data.

## Demo sensor mode

The **Advance simulation** action creates a plausible electricity reading, water reading, optional occupancy estimate and temperature context. A threshold breach creates a persistent alert with `evidenceSource: simulated_sensor`; the 3D facility marker changes to warning/critical accordingly. The application never presents these readings as physical IoT measurements. Resolve an alert only after inspection; recommendations do not auto-resolve alerts.

## API surface

- `GET /api/facilities`
- `GET /api/facilities/:id`
- `POST /api/analyses`
- `GET|POST /api/alerts`
- `PATCH /api/alerts/:id`
- `POST /api/simulator`
- `GET /api/dashboard`
- `POST /api/advisor`

The server validates JSON, MIME types, image size, facility IDs, alert status and record associations. API errors are returned without stack traces or secrets.

## Project structure

`app/` contains the Next.js shell and route handlers. `components/` contains the 3D campus, facility drawer and command-center views. `lib/` owns domain types, seed data, persistence and Gemini validation. `db/schema.sql` is the MySQL schema. `public/manus-routes.json` is the managed route manifest.

## Known limitations

A real campus meter integration is not included; readings are explicitly simulated until a sensor connector is configured. Image analysis is only genuine when `GEMINI_API_KEY` and `GEMINI_MODEL` are set and the provider request succeeds. The local JSON fallback should be replaced by the managed database for multi-instance or production persistence.
