# Runtime in Space

Health monitoring software for astronauts on long missions.
NASA Space Apps Challenge 2026, challenge "Create Health Monitoring Software for Astronauts on Space Missions".

A simulated wearable band streams readings, a forecasting model warns before a value
turns dangerous, and an on-board assistant explains and guides. Emergency steps are
fixed, written protocols.

## Components

| Folder | What it is | Port | Stack |
| --- | --- | --- | --- |
| `frontend/` | The screens | 5173 | React (Vite, JavaScript) |
| `core-api/` | Stores readings, judges status, builds tasks, logs events, keeps reports | 8000 | FastAPI, SQLite |
| `simulator/` | Fake band readings: history and demo scenarios | 8001 | FastAPI |
| `forecast/` | Early warning: forecasts one indicator series | 8002 | FastAPI |
| `assistant/` | Chat with sources, photo analysis, reports for Earth | 8003 | FastAPI |
| *(anomaly service)* | On-demand anomaly check across an indicator's recent readings -- a teammate's deliverable, not in this repo yet. Core calls it and degrades gracefully if it isn't running. | 8004 | -- |
| `content/` | Medical content: indicators, crew, protocols, NASA documents | | JSON, Markdown |
| `contracts/` | The request and response shape of every endpoint | | Markdown |

The frontend talks only to the Core API. The Core API calls the Forecast,
Assistant and (when running) Anomaly services. The simulator pushes readings
into the Core API, in batch history only -- there is no periodic live stream.

## Run everything with Docker

```bash
cp .env.example .env
docker compose up --build
```

Then open http://localhost:5173.

## Run one service by hand

Each Python service is the same:

```bash
cd core-api            # or simulator, forecast, assistant
python -m venv .venv
.venv\Scripts\activate # Windows.  Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000   # 8001, 8002, 8003 for the others
```

Interactive API docs are at `http://localhost:<port>/docs`.

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Set `VITE_USE_MOCK=true` in `frontend/.env` to run the screens with no backend.

## Demo flow

1. Start everything.
2. Load history: `POST http://localhost:8001/history/load` (180 days by default).
   Pass `{"scenario": "infection", "crew_id": 1, "scenario_points": 30}` to make
   the loaded history already look "sick" for one crew member, with no live
   stream needed.
3. Or trigger a scenario live: `POST http://localhost:8001/scenario` with
   `{"crew_id": 1, "scenario": "fatigue"}` -- marks it active and sends one
   reading at full effect immediately.
4. Watch the cards change colour and the early warning appear.
5. Run `POST http://localhost:8000/crew/1/analyze` to check recent readings for
   anomalies on demand (needs the Anomaly service running; degrades to an empty
   result otherwise).

## Hazard coverage

Every indicator is tagged with one of the four simulated spaceflight hazards
and the NASA Human Research Program risk it maps to (see
`content/indicators.json`'s `hazard`/`nasa_risk` fields and
`contracts/README.md`).

| Hazard | Indicators | NASA HRP risk |
| --- | --- | --- |
| Gravity | `heart_rate`, `bp_systolic`, `bp_diastolic` | Cardiovascular adaptations |
| Isolation and confinement | `hrv`, `sleep_hours`, `mood` | Behavioral changes; inadequate sleep and schedules |
| Hostile/closed environment | `skin_temp`, `spo2`, `cabin_co2`, `blood_glucose` | Altered immune / microbes; hypoxia, high CO2; inadequate food and nutrition |
| Radiation | `radiation_dose` | Radiation-induced cancer |

Not covered by this software, by design: bone changes, decompression
sickness, dynamic loads, teamwork and systems operations, and Spaceflight
Associated Neuro-ocular Syndrome (SANS) -- the last needs eye imaging this
project doesn't collect. Distance from Earth is addressed by the design
itself (offline-first, fixed protocols), not by a simulated indicator.

## What is real and what is a placeholder

- All readings are simulated. Scenario effects are illustrative, not clinical models.
- The numbers in `content/indicators.json` are placeholders. Each one must be
  replaced with a value from a named source before the demo.
- `content/protocols/` holds the structure of 11 protocols (cardiac,
  respiratory, neurological, trauma, environmental, immune, behavioral
  health). Every branch and question is real; every step's *text* is empty
  on purpose -- it must come from an approved source, not from us or an AI.
- Picking a crew member on first load (or adding a new one by name) is
  identity selection, not a login. It scopes this browser's screens to one
  person, remembered in `localStorage` -- it is not access control. Anyone
  with API access can still reach another crew member's data directly.
- The assistant chat is multi-turn but session-only: history lives in the
  browser tab, not the database, and resets on reload. Photo analysis is a
  separate one-shot page (`/photo-check`), not part of the chat.
- The forecast service ships a simple linear baseline. Chronos plugs in behind
  the same interface.
- The assistant ships a mock model. A hosted or local model is a config change.
- The anomaly detection model is a teammate's deliverable and isn't in this
  repo. Core API's `/crew/{id}/analyze` calls out to it and returns an empty
  result when it isn't running -- the same pattern as Forecast.
- `content/nasa-docs/` and `content/sample-images/` are new content tracks:
  four short hazard explainers for the assistant's RAG, and an (empty by
  default) folder for demo photos.

## Tests

```bash
cd core-api && pytest
cd simulator && pytest
cd forecast && pytest
cd assistant && pytest
```
