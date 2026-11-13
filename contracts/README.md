# Service contracts

The shape of every call between services. Change this file first, then the code.

## Reading (shared shape)

```json
{
  "crew_id": 1,
  "timestamp": "2026-11-14T09:30:00Z",
  "source": "simulator",
  "values": { "heart_rate": 78, "hrv": 41, "spo2": 97, "skin_temp": 36.6 }
}
```

`source` is `simulator`, `manual` or, later, `watch`. `values` holds any subset of
the indicator ids in `content/indicators.json`.

## Simulator to Core API

### `POST /readings`
Body: one Reading. The Core API stores it, assesses each value and returns:

```json
{
  "stored": 4,
  "assessments": [
    { "indicator": "heart_rate", "value": 78, "status": "yellow",
      "reason": "16% above your baseline of 67" }
  ]
}
```

### `POST /readings/bulk`
Body: `{ "readings": [Reading, ...] }`. Used for history. Stored without
assessments. Returns `{ "stored": 1234 }`.

## Demo operator to Simulator

| Endpoint | Body | Effect |
| --- | --- | --- |
| `POST /history/load` | `{ "days": 180 }` | Generates history and bulk-sends it |
| `POST /live/start` | none | Starts sending a reading per crew member every few seconds |
| `POST /live/stop` | none | Stops the stream |
| `POST /scenario` | `{ "crew_id": 1, "scenario": "fatigue" }` | `dehydration`, `infection`, `fatigue` or `none` |
| `GET /status` | | Stream state and active scenarios |

## Core API to Forecast

### `POST /forecast`

```json
{
  "indicator": "heart_rate",
  "values": [64, 65, 66, 68, 71, 73],
  "horizon": 24,
  "green": [60, 100],
  "yellow": [50, 120]
}
```

Response:

```json
{
  "model": "linear",
  "forecast": [74.1, 75.3],
  "lower": [70.0, 71.0],
  "upper": [78.2, 79.6],
  "slope": 1.2,
  "deviation_score": 2.8,
  "steps_to_yellow": 22,
  "steps_to_red": null
}
```

A step is one reading interval. `steps_to_*` is `null` when the forecast stays
inside that zone for the whole horizon, and `0` when the last value is already outside.

## Core API to Assistant

### `POST /ask`

```json
{ "question": "My heart feels fast when I rest",
  "context": { "crew": {"id": 1, "name": "Crew 1"}, "latest": [], "warnings": [] } }
```

Response: `{ "answer": "...", "sources": [{"title": "...", "snippet": "..."}], "model": "mock" }`

### `POST /analyze-image`

```json
{ "image_base64": "<base64>", "mime_type": "image/jpeg", "note": "rash on forearm" }
```

Response: `{ "description": "...", "next_step": "...", "model": "mock" }`

### `POST /report`

```json
{ "context": { "crew": {}, "latest": [], "warnings": [], "events": [] }, "days": 7 }
```

Response: `{ "report": "...", "model": "mock" }`

## Frontend to Core API

| Endpoint | Purpose |
| --- | --- |
| `GET /crew` | Crew list |
| `GET /crew/{id}/dashboard` | Everything the home screen shows. Polled every 2 seconds |
| `GET /crew/{id}/readings?indicator=heart_rate&limit=500` | Series for a chart |
| `POST /readings` | Daily check-in, with `"source": "manual"` |
| `GET /crew/{id}/tasks` | Today's tasks |
| `POST /tasks/{task_id}/done` | Tick a task |
| `GET /crew/{id}/events` | Event log |
| `POST /events` | Log an emergency step |
| `POST /assistant/ask` | `{ "crew_id": 1, "question": "..." }` |
| `POST /assistant/analyze-image` | `{ "crew_id": 1, "image_base64": "...", "mime_type": "...", "note": "..." }` |
| `POST /crew/{id}/reports` | Generate a report for Earth |
| `GET /crew/{id}/reports` | Past reports |
| `GET /content/indicators` | Indicator definitions and guide texts |

### Dashboard response

```json
{
  "crew": { "id": 1, "name": "Crew 1", "role": "Commander" },
  "indicators": [
    { "id": "heart_rate", "name": "Heart rate", "unit": "bpm", "body_area": "heart",
      "source": "band", "value": 78, "timestamp": "2026-11-14T09:30:00Z",
      "status": "yellow", "reason": "16% above your baseline of 67",
      "trend": [70, 71, 73, 75, 78] }
  ],
  "body_areas": { "heart": "yellow", "head": "green" },
  "warnings": [ { "id": 3, "type": "early_warning", "message": "...", "timestamp": "..." } ],
  "tasks": [ { "id": 9, "title": "Measure blood pressure", "done": false } ],
  "streak": 12
}
```
