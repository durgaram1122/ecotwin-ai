# EcoTwin AI — Implementation Plan

## Scope
Build a polished, runnable sustainable-campus digital twin for a hackathon demo. The 3D campus is the primary experience; operational data, image analysis, simulated sensors, alerts, analytics, and the AI Advisor are connected through real API routes and a persistence layer.

## Implementation approach
- **Frontend:** Next.js App Router + React + TypeScript. A single responsive command center keeps the 3D campus visible while the right-hand facility drawer exposes the selected record. Tabbed operational views provide dashboard, alerts, analytics, advisor and settings without making the 3D centerpiece feel secondary.
- **3D:** React Three Fiber, Drei, Three.js and OrbitControls. Low-poly architectural meshes are composed into identifiable campus zones: academic block, computer lab, library, washroom wing, corridors and canteen. Status colors are driven by stored alerts and selected facility state; labels and controls remain accessible outside the canvas.
- **Backend:** Next.js route handlers under `/api`. Every action validates facility IDs and request bodies server-side. Image analysis is a server-only call to Gemini REST using `GEMINI_API_KEY` and `GEMINI_MODEL`; missing credentials or provider failures return explicit errors, never demo detections.
- **Persistence:** `mysql2` uses `DATABASE_URL` when configured and creates additive tables from `db/schema.sql`. When no database is available, a clearly documented `data/ecotwin.json` store keeps the demo functional across refreshes in local development. Demo seed data is marked as simulated.
- **Data products:** Facilities, uploaded image metadata, image analyses, sensor readings, alerts, recommendations and reports share stable IDs and timestamps. The simulator advances labelled readings and creates threshold alerts; the dashboard reads the same records used by facility panels.
- **Validation:** Use host TypeScript diagnostics, `npm run lint`, `npm run build`, direct API smoke checks and Preview screenshots only where needed to verify the visual centerpiece.

## Project structure
- `app/` — layout, global styles, command-center page and server route handlers.
- `components/` — 3D campus, shell navigation, facility drawer, KPI cards, charts, alerts and advisor modules.
- `lib/` — domain types, seed data, persistence adapter, validation helpers and Gemini client.
- `db/schema.sql` — MySQL-compatible relational schema and indexes.
- `data/` — local JSON persistence fallback, created at runtime and ignored from source control.
- `public/manus-routes.json` — route manifest for the managed preview.
- `.env.example` and `README.md` — configuration and honest setup guidance.

## Design direction

### Alternatives considered
- **0.06 — Architectural command center:** premium smart-city control room, deep navy surfaces, cyan wireframe accents and emerald health signals.
- **0.08 — Biophilic editorial:** pale mineral surfaces, botanical green, warm photography and magazine-like data stories.
- **0.04 — Carbon observatory:** graphite canvas, amber instrumentation and restrained red critical markers.

### Chosen movement: Architectural command center
A smart-campus operations room translated into an elegant, human-readable interface.

- **Core principles:** make the campus tangible; keep evidence close to decisions; use color as a truthful status language; reveal depth progressively.
- **Color philosophy:** midnight navy anchors the interface like a control-room wall; cool cyan denotes interaction and spatial focus; emerald means healthy systems; amber/red are reserved for attention and never used decoratively.
- **Layout paradigm:** a wide stage-and-drawer composition. The live digital twin occupies the main stage, while a slim navigation rail and contextual detail drawer slide in around it. Analytics and alerts appear as lower operational bands rather than a generic dashboard grid.
- **Signature elements:** cyan selection halos around facilities, vertical status rail marks, and compact “signal” chips that state whether data is simulated, AI-derived or stored.
- **Interaction philosophy:** every click should answer “what is this place, what is happening, and what should I do next?” Hover previews spatial identity; selection opens evidence; actions always expose their data source.
- **Animation:** gentle camera easing, 180–260ms drawer transitions, low-amplitude signal pulses only on active alerts, and no looping motion that competes with the campus.
- **Typography system:** `Inter`/system sans for operational clarity; uppercase micro-labels with generous tracking; large display figures with tight line-height and tabular numerals.
- **Brand essence:** the honest operating layer for a more sustainable campus — spatial, evidence-led, actionable. Personality: precise, calm, optimistic.
- **Brand voice:** headlines are direct and observant; CTAs say what will happen. Examples: “See the campus as a living system.” / “Inspect the evidence, then move the needle.”
- **Wordmark & logo:** a linked twin-node mark: two offset emerald/cyan points connected by a short diagonal line, echoing a campus map and a digital signal.
- **Signature brand color:** `#55E6A5` — signal emerald, a bright but disciplined sustainability accent used for healthy-state confirmation.

## Material constraints
- Never expose Gemini or database secrets to the browser.
- Never describe simulated readings as real measurements.
- Never claim hidden leaks, measured consumption or occupancy duration from a still image.
- Keep the app usable without external credentials, but show setup guidance instead of fake AI success.
