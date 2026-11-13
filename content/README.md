# Content

Everything here is data that the services read. Nothing here is code.

| File | Read by | What it is |
| --- | --- | --- |
| `indicators.json` | core-api, frontend (through the API) | Limits and guide texts per indicator |
| `crew.json` | core-api (seed), simulator | Crew members and their personal baselines |
| `protocols/*.json` | frontend | Emergency protocols as decision trees |
| `nasa-docs/` | assistant | Source documents for retrieval |

## Rules

- Every number in `indicators.json` is a placeholder until its `reference` field
  names the source it was taken from.
- Protocol step texts come from an approved medical source. Do not write them
  yourself and do not generate them with an AI.

## Protocol format

A protocol is a set of nodes. Each node has a `type`:

- `question`: yes/no. Has `yes` and `no`, each the id of the next node.
- `instruction`: one action. Has `next`.
- `timer`: an action with a countdown. Has `seconds` and `next`.
- `end`: the last screen. Says whether to escalate.
