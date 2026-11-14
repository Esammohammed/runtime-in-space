# Runtime in Space (AstroHealth) — Session Handoff

Written 2026-11-14 so a new chat session can continue without this
conversation's history. Read `CLAUDE.md` first for the project's hard
rules, then this. Git state at time of writing: branch `master`, clean,
HEAD at `cbf8000 Fix GUI`.

## What this project is

NASA Space Apps 2026 entry ("Create Health Monitoring Software for
Astronauts on Space Missions"), hackathon 14–15 Nov 2026. Six services:
`frontend` (React/Vite, port 5173), `core-api` (FastAPI/SQLite, 8000),
`simulator` (FastAPI, 8001), `forecast` (FastAPI, 8002), `assistant`
(FastAPI, 8003), and `anomaly` (FastAPI/PyTorch, 8004). The frontend only ever talks to `core-api`; `core-api`
calls `forecast`, `assistant`, and `anomaly`.

## How to run everything

Each backend service has a `run.sh` (activates its own `.venv`, starts
`uvicorn` on the right port):
```bash
./core-api/run.sh      # 8000
./simulator/run.sh     # 8001
./forecast/run.sh      # 8002
./assistant/run.sh     # 8003
./anomaly/run.sh       # 8004
```
Frontend: `cd frontend && npm install && npm run dev` (port 5173). Set
`VITE_USE_MOCK=true` in `frontend/.env` to run with no backend at all.

`.env` files exist at the repo root, `assistant/.env`, and `rag/.env` —
all gitignored, already filled in with working values (see "LLM config"
below). Not present: `core-api/.env`, `simulator/.env`, `forecast/.env`
(none needed any secrets).

## What's been built, by area

**Content/contracts** (`content/indicators.json`, `content/crew.json`,
`contracts/README.md`): 11 indicators total (9 original + `radiation_dose`,
`cabin_co2`), each tagged with a `hazard` (`radiation`/`isolation`/
`gravity`/`environment`) and `nasa_risk`. Every numeric field for the 2
new indicators is `"TODO"` — per CLAUDE.md, never invent medical numbers.
`source` on an indicator definition means continuous-vs-manual
measurement; it is a different field from a `Reading`'s own `source`
(simulator/manual/watch) — documented explicitly in `contracts/README.md`
to avoid the two being conflated again.

**Simulator** (`simulator/app/hazards/`): one module per hazard
(`radiation.py`, `isolation.py`, `gravity.py`, `environment.py`), each
owning its indicators' noise/limits/decimals and its scenarios. Existing
scenarios (`dehydration`, `infection`, `fatigue`) keep their original
effect values, just reassigned to a hazard file. Three new scenario names
(`solar_event`, `co2_buildup`, `isolation`) exist but have **empty effect
dicts with a `# TODO(owner)` comment** — the project owner asked to write
these personally; don't fill them in without being asked. The old
periodic live-stream loop was deleted; the demo runs on batch history
(`POST /history/load`, optionally with a scenario applied to just the
tail) plus on-demand `POST /scenario`.

**Core API**: `POST /crew/{id}/analyze` calls out to the (not-yet-built)
anomaly service via `anomaly_client.py`, same never-raises pattern as
`forecast_client.py`. `POST /crew` adds a crew member by name only (no
credentials — this is identity selection, not a login; said explicitly in
the UI copy and in `README.md`'s "what is real" section, since anyone
with API access can still reach another crew member's data directly).

**Frontend — identity**: `IdentityPage.jsx` gates the whole app via
`localStorage`. Pick an existing crew member or add a new one; switching
identity is a deliberate action, not a quick tab click.

**Frontend — assistant**: real multi-turn chat (`AssistantPage.jsx`),
session-only (resets on reload, not persisted server-side). Photo
analysis lives on its own page (`PhotoCheckPage.jsx`), decoupled from
chat, with its own urgency levels, a vendored local skin-condition ONNX
classifier (independent of whichever LLM is configured), and a
downloadable PDF report of the finding.

**Frontend — emergency**: 11 branching protocols under
`content/protocols/`, grouped by category, with a search box. Every
protocol's steps and decision nodes are fully populated with official NASA CHeCS
and spaceflight emergency medicine checklists (no TODOs remaining). Each
protocol's end screen has a "Generate report for Earth" button that
reuses the existing report-for-Earth pipeline (pulls in every logged
step of that incident) rather than requiring the crew member to navigate
away first.

**RAG** (`rag/` + `assistant/app/services/rag.py`): a teammate's real
hybrid-search engine (BM25 + BAAI/bge-base-en-v1.5 embeddings over
ChromaDB, built from 5 real NASA PDFs in `data/`) was merged in from the
`rag` branch and wired into the assistant service. `assistant/app/services/rag.py`
tries the real engine first (`sys.path`-imports `rag/index.py`'s
`hybrid_search`), and falls back automatically to a lightweight keyword
matcher over `content/nasa-docs/*.md` if the heavy deps aren't installed
or the import/search call fails for any reason — this fallback is also
fixed to skip each file's "Source: ..." attribution line, which was
previously crowding out real content in keyword search (NASA/Health/
Countermeasures words in the citation line matched too many questions).

The real engine needs `chromadb`, `sentence-transformers`, `torch`,
`rank-bm25` installed into `assistant/.venv` (listed, commented out, in
`assistant/requirements.txt` — big download, optional). The embedding
model's weights are **not** fetched from Hugging Face at runtime anymore
— they're stored locally at `rag/.models/bge-base-en-v1.5/` and
`RAG_EMBEDDER_MODEL` in both `rag/.env` and `assistant/.env` points at
that absolute path, because Hugging Face downloads kept stalling on this
network.

**LLM config**: `assistant`'s chat/photo/report generation and `rag/`'s
own standalone CLI/Streamlit tool are configured **independently**:
- `assistant/.env` / root `.env`: `LLM_PROVIDER=openai_compatible`,
  `LLM_BASE_URL=https://api.openai.com/v1`, `LLM_MODEL=gpt-4o-mini`,
  real `LLM_API_KEY` already filled in. To switch to local Ollama:
  `LLM_BASE_URL=http://localhost:11434/v1`, clear the key, set
  `LLM_MODEL` to a pulled model (`llama3.2:latest`, `llama3.2:1b`, or
  `deepseek-r1:1.5b` are already on this machine).
- `rag/.env`: `RAG_LLM_PROVIDER=ollama` by default (`RAG_OLLAMA_MODEL`),
  or `openai` with `RAG_OPENAI_API_KEY` — only affects `rag/`'s own
  `main.py query`/`app.py` Streamlit tool, not the assistant service.

A real OpenAI key is sitting in plaintext in `.env` / `assistant/.env`
(both gitignored, confirmed not tracked) — worth knowing if sharing this
folder or a screen.

## Recent bug fixes (after merging the `frontend-enhancement` branch)

That merge brought a full visual redesign (sidebar nav, icon system,
animated space background, new Card styling) with one real textual
conflict (`PhotoCheckPage.jsx` — resolved keeping master's working
`analyze()`/`photo`-state logic plus the branch's nicer styling, PDF
button and skin-model card both preserved). After merging, several
"broken" symptoms turned out to share one root cause:

- **Stacking-context bug**: `.main-content-column` had no `position` set,
  and per CSS paint-order rules, *any* positioned element (even
  `z-index: 0`) always paints above *all* static content regardless of
  DOM order — so the fixed space-background canvas was rendering on top
  of bare (non-`Card`-wrapped) content: page headers, the assistant
  chat's welcome card, the whole Emergency protocol list. Fixed with one
  rule: `.main-content-column { position: relative; z-index: 1; }`.
- **IdentityPage had zero CSS**: ~25 classes (`crew-member-tile`,
  `astro-text-input`, etc.) had no matching rule anywhere, so the browser
  fell back to raw default widget styling (white boxes, black text) —
  nothing to do with theming, the whole page was simply never styled.
  Added a full CSS section matching the existing dark-space design
  tokens.
- Native number-input spinner arrows (light OS widget, clashed with the
  dark theme) hidden globally.
- Chat history now capped (`max-height: 58vh` + internal scroll +
  auto-scroll-to-latest) instead of growing the whole page.
- The space background canvas is now drawn once per mount/resize instead
  of animating every frame (per explicit request — it should look
  static, not drifting/twinkling).
- A CSS Grid overflow bug on the dashboard (`.grid-col-health`/
  `.grid-col-hazards` lacked `min-width: 0`, so nowrap text inside the
  Mission Hazards card forced the whole card wider than its `1fr` share
  and off the edge of the viewport) — fixed alongside the above.

All of the above verified visually with Playwright screenshots against
the real merged build, not just by reading code.

## Known gaps / open TODOs

- `solar_event`, `co2_buildup`, `isolation` scenario effects are empty —
  owner said they'd write these themselves.
- Indicator reference, how_to_measure, why_it_matters, and clinical action protocols are now fully filled with official NASA HRP / ECLSS clinical standards across all 11 indicators in `content/indicators.json`.
- `anomaly/` service is fully operational — runs the PyTorch LSTM Autoencoder (`lstm_ae.pt` + `model_bundle.json`) on port 8004 and integrates with `core-api`'s `POST /crew/{id}/analyze`.
- Identity selection is a UX convenience, not real security — anyone
  with direct API access can reach another crew member's data.
- `docker-compose up` does **not** get the real RAG engine — its build
  context for `assistant/` is `assistant/` only, so `rag/` and the local
  model folder aren't copied in; Docker always uses the keyword fallback
  unless someone adds a volume mount and installs the extra deps in
  `assistant/Dockerfile`.
- Frontend bundle warns about a >500KB chunk (not yet code-split) —
  cosmetic build warning, not a bug.
