#!/usr/bin/env bash
# Activate this service's venv and run it. Usage: ./run.sh (from Git Bash)
set -e
cd "$(dirname "${BASH_SOURCE[0]}")"
source .venv/Scripts/activate
uvicorn app.main:app --reload --port 8002
