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
| `simulator/` | Fake band readings: history, live stream, demo scenarios | 8001 | FastAPI |
| `forecast/` | Early warning: forecasts one indicator series | 8002 | FastAPI |
| `assistant/` | Chat with sources, photo analysis, reports for Earth | 8003 | FastAPI |
| `content/` | Medical content: indicators, crew, protocols, NASA documents | | JSON, Markdown |
| `contracts/` | The request and response shape of every endpoint | | Markdown |

The frontend talks only to the Core API. The Core API calls the Forecast and
Assistant services. The simulator pushes readings into the Core API.

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
3. Start the live stream: `POST http://localhost:8001/live/start`.
4. Trigger a scenario: `POST http://localhost:8001/scenario` with
   `{"crew_id": 1, "scenario": "fatigue"}`.
5. Watch the cards change colour and the early warning appear.

## What is real and what is a placeholder

- All readings are simulated. Scenario effects are illustrative, not clinical models.
- The numbers in `content/indicators.json` are placeholders. Each one must be
  replaced with a value from a named source before the demo.
- `content/protocols/` holds the structure of a protocol. The step texts are
  empty on purpose: they must come from an approved source, not from us or an AI.
- The forecast service ships a simple linear baseline. Chronos plugs in behind
  the same interface.
- The assistant ships a mock model. A hosted or local model is a config change.

## Tests

```bash
cd core-api && pytest
cd forecast && pytest
```
