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

**Naming collision, read carefully:** this is not the same `source` as the one
on an indicator *definition* below. A Reading's `source` says which service
sent it. An indicator definition's `source` says how that indicator is
measured (`continuous` or `manual`) and never changes per-reading. The two
happen to share a field name; don't conflate them.

## Indicator definition (shared shape, from `content/indicators.json`)

```json
{
  "id": "heart_rate", "name": "Heart rate", "unit": "bpm", "body_area": "heart",
  "source": "continuous",
  "hazard": "gravity", "nasa_risk": "Cardiovascular adaptations",
  "green": [60, 100], "yellow": [50, 120],
  "reference": "TODO", "how_to_measure": "TODO", "why_it_matters": "TODO",
  "actions": { "yellow": "TODO", "red": "TODO" }
}
```

`source` is `continuous` (simulator-fed) or `manual` (daily check-in).
`hazard` is one of the four simulated spaceflight hazards: `radiation`,
`isolation`, `gravity`, `environment`. `nasa_risk` names the NASA HRP risk
area it maps to (free text, e.g. `"Cardiovascular adaptations"`). Both
fields are informational — they drive the frontend's hazard filter and
labels, not the status rules.

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

The live periodic stream (`/live/start`, `/live/stop`) has been removed —
the demo runs on batch history plus on-demand scenarios instead.

| Endpoint | Body | Effect |
| --- | --- | --- |
| `POST /history/load` | `{ "days": 180, "scenario": "infection", "crew_id": 1, "scenario_points": 30 }` | Generates history and bulk-sends it. `scenario`/`crew_id`/`scenario_points` are all optional; when given, the named scenario's full effect is applied to only the last `scenario_points` readings for that crew (or all crew if `crew_id` is omitted), so loaded history can already look "sick" with no live stream running. |
| `POST /scenario` | `{ "crew_id": 1, "scenario": "fatigue" }` | Marks a scenario active for one crew member (or clears it with `none`) and immediately sends one reading at the scenario's full effect for its daily-only indicators, so the dashboard shows a change right away. A later `/history/load` call for that crew picks up the same active scenario for its `scenario_points` tail. Valid names come from the hazard registry in `simulator/app/hazards/`: `dehydration`, `infection`, `fatigue` (existing), `solar_event`, `co2_buildup`, `isolation` (new — effects left empty, TODO, until filled in by hand), or `none`. An unknown name is a 422, not a crash. |
| `GET /status` | | Active scenarios per crew member, and the last send error if any |

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

## Core API to Anomaly

Not built in this repo yet — a teammate's service, same relationship Core
already has with Forecast. Core calls out to it and degrades gracefully
(empty results, `model: null`) if it isn't running.

### `POST /analyze`

```json
{
  "crew_id": 1,
  "window": { "heart_rate": [64, 65, 66, 68, 71, 73], "hrv": [41, 39, 40] }
}
```

Response:

```json
{
  "model": "zscore",
  "results": {
    "heart_rate": { "is_anomaly": true, "score": 2.9 },
    "hrv": { "is_anomaly": false, "score": 0.4 }
  }
}
```

One call covers every indicator for a crew member. `window` holds whatever
indicators Core has at least `analyze_window` readings for — by count, not
by time, so it also works over history-loaded data, unlike the early-warning
forecast trigger.

## Core API to Assistant

### `POST /ask`

```json
{ "question": "My heart feels fast when I rest",
  "history": [{ "role": "user", "content": "Earlier question" },
              { "role": "assistant", "content": "Earlier answer" }],
  "context": { "crew": {"id": 1, "name": "Crew 1"}, "latest": [], "warnings": [] } }
```

Response: `{ "answer": "...", "sources": [{"title": "...", "snippet": "..."}], "model": "mock" }`

`history` is the prior turns of the same conversation, oldest first, so the
model can hold a multi-turn chat instead of answering each question cold.
It's kept client-side only (not persisted in the database) -- a page refresh
starts a new conversation.

### `POST /analyze-image`

```json
{ "image_base64": "<base64>", "mime_type": "image/jpeg", "note": "rash on forearm" }
```

Response:

```json
{
  "description": "...", "next_step": "...", "urgency": "show_officer", "model": "mock",
  "skin_model": {
    "label": "Eczema", "confidence": 0.74,
    "top3": [{ "label": "Eczema", "confidence": 0.74 }, { "label": "Normal Skin", "confidence": 0.15 },
             { "label": "Acne Vulgaris", "confidence": 0.06 }],
    "disclaimer": "Experimental prototype model, not a medical diagnosis. ..."
  }
}
```

`urgency` is one of `watch`, `show_officer`, `alert_ground`. It defaults to
`show_officer` when the vision model's reply can't be parsed, same fallback the
`next_step` field already had.

`skin_model` is a second, independent signal: a local, vendored, five-class
(Acne Vulgaris / Eczema / Fungal Infection / Psoriasis / Normal Skin) ONNX
classifier -- see `assistant/app/services/skin_classifier.py` and
`assistant/app/ml/skin_model/NOTICE.md` for its source and scope. It never
touches the vision LLM's own description or urgency call. It is `null` when
onnxruntime or the model artifact aren't available, or the photo can't be
decoded -- the endpoint never 500s because of it. `confidence` is the model's
own softmax score, not a clinically calibrated probability; the upstream
project documents real-world accuracy around 70% on its own evaluation set,
weak on two of its four condition classes. Treat it as experimental, same as
every other number this field returns -- never invented, never authoritative.

### `GET /sample-images`

Returns `["forearm_rash.jpg", ...]` -- filenames of whatever demo photos
have been dropped in `content/sample-images/`. Empty by default.

### `GET /sample-images/{name}`

Returns the raw image bytes for one sample, for the "try a sample" picker.
404 for an unknown name or a path that doesn't resolve inside the folder.

### `POST /report`

```json
{ "context": { "crew": {}, "latest": [], "warnings": [], "events": [] }, "days": 7 }
```

Response: `{ "report": "...", "model": "mock" }`

## Frontend to Core API

| Endpoint | Purpose |
| --- | --- |
| `GET /crew` | Crew list |
| `POST /crew` | Add a crew member: `{ "name": "Crew 5", "role": "" }`. No credentials -- this is identity selection, not a login. |
| `GET /crew/{id}/dashboard` | Everything the home screen shows. Polled every 2 seconds |
| `GET /crew/{id}/readings?indicator=heart_rate&limit=500` | Series for a chart |
| `POST /readings` | Daily check-in, with `"source": "manual"` |
| `GET /crew/{id}/tasks` | Today's tasks |
| `POST /tasks/{task_id}/done` | Tick a task |
| `GET /crew/{id}/events` | Event log |
| `POST /events` | Log an emergency step |
| `POST /assistant/ask` | `{ "crew_id": 1, "question": "...", "history": [{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}] }` |
| `POST /assistant/analyze-image` | `{ "crew_id": 1, "image_base64": "...", "mime_type": "...", "note": "..." }` |
| `GET /assistant/sample-images` | Filenames for the "try a sample" picker |
| `GET /assistant/sample-images/{name}` | One sample photo's bytes |
| `POST /crew/{id}/reports` | Generate a report for Earth |
| `GET /crew/{id}/reports` | Past reports |
| `GET /content/indicators` | Indicator definitions and guide texts |
| `POST /crew/{id}/analyze` | Run anomaly detection over each indicator's recent readings; see below |

### Dashboard response

```json
{
  "crew": { "id": 1, "name": "Crew 1", "role": "Commander" },
  "indicators": [
    { "id": "heart_rate", "name": "Heart rate", "unit": "bpm", "body_area": "heart",
      "source": "continuous", "hazard": "gravity", "nasa_risk": "Cardiovascular adaptations",
      "value": 78, "timestamp": "2026-11-14T09:30:00Z",
      "status": "yellow", "reason": "16% above your baseline of 67",
      "trend": [70, 71, 73, 75, 78] }
  ],
  "body_areas": { "heart": "yellow", "head": "green" },
  "warnings": [ { "id": 3, "type": "early_warning", "message": "...", "timestamp": "..." } ],
  "tasks": [ { "id": 9, "title": "Measure blood pressure", "done": false } ],
  "streak": 12
}
```

### `POST /crew/{id}/analyze` response

```json
{
  "model": "zscore",
  "results": [
    { "indicator": "heart_rate", "is_anomaly": true, "score": 2.9 },
    { "indicator": "hrv", "is_anomaly": false, "score": 0.4 }
  ]
}
```

`model` is `null` and `results` is `[]` when the Anomaly service isn't
reachable — the endpoint always returns 200, never a 500, so the frontend
can show "model unavailable" instead of an error.

<!-- CHECKPOINT id="ckpt_mwf2c2h5_o7i7t1" time="2026-11-13T14:19:19.817Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mwf2oxfu_qg59c7" time="2026-11-13T14:29:19.818Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mwf31sej_tkfb1s" time="2026-11-13T14:39:19.819Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mwf3endg_hpi4bp" time="2026-11-13T14:49:19.828Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mwf3ricg_z73zps" time="2026-11-13T14:59:19.840Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mwf44db8_c5u3ym" time="2026-11-13T15:09:19.844Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mwf4h8a3_dywf3o" time="2026-11-13T15:19:19.851Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mwf4u391_8fs32h" time="2026-11-13T15:29:19.861Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mwf6me3k_mrveey" time="2026-11-13T16:19:19.904Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mwf6z92m_qeh063" time="2026-11-13T16:29:19.918Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mwf7c41p_daal4a" time="2026-11-13T16:39:19.933Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mwf94ewh_38h0x8" time="2026-11-13T17:29:19.985Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mwfbzanu_ufpcl2" time="2026-11-13T18:49:20.058Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mwfcp0ll_ky3jbz" time="2026-11-13T19:09:20.073Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mwfd1vkb_eilgiq" time="2026-11-13T19:19:20.075Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mwfdeqj9_lwevnh" time="2026-11-13T19:29:20.085Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mwfdrlhy_u24pvy" time="2026-11-13T19:39:20.086Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mwfe4ggt_iw949l" time="2026-11-13T19:49:20.093Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mwfeu6el_bq73ih" time="2026-11-13T20:09:20.109Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->
