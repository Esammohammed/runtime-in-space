# Runtime in Space: project context

Astronaut health monitoring for NASA Space Apps 2026. Read `README.md` for the
component table and `contracts/README.md` for every endpoint.

## Architecture rules

- The frontend calls the Core API only. It polls `GET /crew/{id}/dashboard`.
- The Core API is the only service with a database. It calls Forecast and Assistant.
- The simulator only pushes readings to the Core API.
- Forecast and Assistant are stateless and know nothing about the crew.
- Every reading has the same shape whatever its source. Keep the `source` field.

## Product rules that must not be broken

- Status (green, yellow, red) comes from fixed rules in `core-api/app/services/assessment.py`
  and limits in `content/indicators.json`. No AI in that step.
- Emergency steps are fixed, written protocols in `content/protocols/`. The AI may
  choose a protocol and explain it. It must never write or change the steps.
- Never invent medical numbers or steps. A missing value stays a TODO with a note.
- The assistant answers with its sources.
- Claims in the pitch must match the code. Simulated data is called simulated.

## Code conventions

Python services share one layout:

```
app/
  main.py        FastAPI app, routers mounted here
  core/          settings
  routers/       HTTP layer only: parse, call a service, return
  services/      logic, no FastAPI imports
  schemas/       Pydantic request and response models
  db/            (core-api only) engine, models, seed
```

- Routers stay thin. Logic goes in `services/` so it can be tested without HTTP.
- Settings come from environment variables through `core/config.py`.
- Type hints everywhere. Small functions.

Frontend layout:

```
src/
  pages/         one file per screen, composes components
  components/    reusable pieces, no data fetching
  services/      all HTTP calls, plus mock data
  hooks/         usePolling and friends
  context/       selected crew member
  constants/     status colours and labels
  styles/        global CSS variables
```

- Components receive data through props. Pages fetch through `services/`.
- Status is always shown as a word and a shape, never colour alone.

## Changing a contract

Change `contracts/README.md` first, then both sides, in the same commit.
