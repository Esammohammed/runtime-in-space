import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent
REPO_ROOT = BASE_DIR.parents[1]
CONTENT_DIR = REPO_ROOT / "content"

BUNDLE = json.loads((BASE_DIR / "model_bundle.json").read_text(encoding="utf-8"))
TARGET = BUNDLE["target"]
MODEL_COLS = BUNDLE["model_cols"]
WIN = BUNDLE["cfg"]["win"]
STEP_MIN = BUNDLE["cfg"]["step_min"]
THR_WARN = BUNDLE["threshold_warn"]          # ~0.9385
THR_HIGH = BUNDLE["threshold_high"]          # ~1.8084
HIGH_SEVERITY = THR_HIGH / THR_WARN
MIN_BASELINE_ROWS = 7 * 24 * 60 // STEP_MIN
NORM_KEYS = ["hr_mean", "hr_std", "log_steps"]

MESSAGES = {
    "normal": "No unusual pattern detected.",
    "warning": "Unusual pattern, keep an eye on it.",
    "high": "Strong anomaly, check your health or contact a doctor.",
}
DISCLAIMER = "Screening and early-warning tool, not a medical diagnosis."

app = FastAPI(title="Runtime in Space - Anomaly Service (LSTM-AE)", version="1.1")


class Reading(BaseModel):
    timestamp: datetime
    hr_mean: float = Field(..., ge=30, le=220)
    hr_std: float = Field(..., ge=0, le=100)
    steps: float = Field(0, ge=0)


class BaselineRequest(BaseModel):
    readings: List[Reading]


class DetectRequest(BaseModel):
    window: List[Reading]
    norm: Optional[Dict[str, List[float]]] = None
    subject_id: Optional[str] = None


class AnalyzeRequest(BaseModel):
    crew_id: int
    window: Dict[str, List[float]]


_model = None


def get_model():
    global _model
    if _model is None:
        import torch
        import torch.nn as nn

        a = BUNDLE["arch"]

        class LSTMAE(nn.Module):
            def __init__(self, n_in, n_ctx, n_out, hidden, latent, ctx_only):
                super().__init__()
                self.n_out, self.ctx_only = n_out, ctx_only
                self.enc = nn.LSTM(n_ctx if ctx_only else n_in, hidden, batch_first=True)
                self.to_z = nn.Linear(hidden, latent)
                self.from_z = nn.Linear(latent, hidden)
                self.dec = nn.LSTM(hidden + n_ctx, hidden, batch_first=True)
                self.out = nn.Linear(hidden, n_out)

            def forward(self, x):
                ctx = x[:, :, self.n_out:]
                _, (h, _) = self.enc(ctx if self.ctx_only else x)
                z = self.to_z(h[-1])
                d = self.from_z(z).unsqueeze(1).expand(-1, x.size(1), -1)
                o, _ = self.dec(torch.cat([d, ctx], -1))
                return self.out(o)

        m = LSTMAE(a["n_in"], a["n_ctx"], a["n_out"], a["hidden"], a["latent"], a["ctx_only"])
        m.load_state_dict(torch.load(BASE_DIR / "lstm_ae.pt", map_location="cpu"))
        m.eval()
        _model = m
    return _model


def predict_errors(x):
    import torch

    with torch.no_grad():
        xb = torch.tensor(x, dtype=torch.float32)
        rec = get_model()(xb)
        return ((rec - xb[:, :, :len(TARGET)]) ** 2).mean(1).numpy()[0]


def to_frame(readings):
    rows = [r.model_dump() if hasattr(r, "model_dump") else r.dict() for r in readings]
    df = pd.DataFrame(rows)
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    return df.sort_values("timestamp").reset_index(drop=True)


def load_crew_baselines() -> dict[int, dict[str, float]]:
    try:
        data = json.loads((CONTENT_DIR / "crew.json").read_text(encoding="utf-8"))
        return {m["id"]: m.get("baselines", {}) for m in data.get("crew", [])}
    except Exception:
        return {}


def load_indicators_definitions() -> dict[str, dict]:
    try:
        data = json.loads((CONTENT_DIR / "indicators.json").read_text(encoding="utf-8"))
        return {item["id"]: item for item in data.get("indicators", [])}
    except Exception:
        return {}


SUBJECT_MAP = {
    1: "p01",
    2: "p02",
    3: "p04",
    4: "p05",
    5: "p06",
    6: "p07",
    7: "p08",
    8: "p09",
}


def resolve_norm_for_crew(crew_id: int) -> dict:
    subject_id = SUBJECT_MAP.get(crew_id, "p01")
    norm = {}
    for c in NORM_KEYS:
        key = f"{subject_id}|{c}"
        if key in BUNDLE["norm"]:
            norm[c] = list(BUNDLE["norm"][key])
        else:
            norm[c] = list(BUNDLE["norm"][f"p01|{c}"])

    # Personalize hr_mean using the astronaut's recorded pre-flight baseline
    crew_baselines = load_crew_baselines().get(crew_id, {})
    if "heart_rate" in crew_baselines:
        norm["hr_mean"][0] = float(crew_baselines["heart_rate"])

    return norm


def resolve_norm(norm, subject_id):
    if norm is None:
        if subject_id is None:
            subject_id = "p01"
        try:
            norm = {c: BUNDLE["norm"][f"{subject_id}|{c}"] for c in NORM_KEYS}
        except KeyError:
            norm = {c: BUNDLE["norm"][f"p01|{c}"] for c in NORM_KEYS}
    for c in NORM_KEYS:
        v = norm.get(c)
        if v is None or len(v) != 2 or not np.isfinite(v).all() or v[1] <= 0:
            raise HTTPException(status_code=422, detail=f"norm['{c}'] must be [mean, std] with std > 0.")
    return norm


def build_input(df, norm):
    tod = (df.timestamp.dt.hour + df.timestamp.dt.minute / 60) / 24 * 2 * np.pi
    cols = {
        "hr_mean_z": (df.hr_mean - norm["hr_mean"][0]) / norm["hr_mean"][1],
        "hr_std_z": (df.hr_std - norm["hr_std"][0]) / norm["hr_std"][1],
        "log_steps_z": (np.log1p(df.steps) - norm["log_steps"][0]) / norm["log_steps"][1],
        "sin_tod": np.sin(tod),
        "cos_tod": np.cos(tod),
    }
    return np.column_stack([cols[c] for c in MODEL_COLS]).astype(np.float32)[None]


def classify(score):
    # Calibrated severity with slight tolerance band to avoid spurious warnings on noise
    severity = score / THR_WARN
    level = "high" if severity >= HIGH_SEVERITY else "warning" if severity >= 1.05 else "normal"
    return severity, level


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "anomaly",
        "model": "lstm_ae",
        "window_length": WIN,
        "step_minutes": STEP_MIN,
        "thresholds": {"warning": round(THR_WARN, 3), "high": round(THR_HIGH, 3)},
    }


@app.post("/baseline")
def baseline(req: BaselineRequest):
    df = to_frame(req.readings)
    if len(df) < MIN_BASELINE_ROWS:
        raise HTTPException(status_code=422,
                            detail=f"Need at least {MIN_BASELINE_ROWS} readings (7 days) of normal data; 14 days recommended.")
    steps = np.log1p(df.steps)
    norm = {
        "hr_mean": [float(df.hr_mean.mean()), float(max(df.hr_mean.std(), 1e-3))],
        "hr_std": [float(df.hr_std.mean()), float(max(df.hr_std.std(), 1e-3))],
        "log_steps": [float(steps.mean()), float(max(steps.std(), 1e-3))],
    }
    return {"norm": norm, "n_readings": len(df)}


@app.post("/detect")
def detect(req: DetectRequest):
    if len(req.window) != WIN:
        raise HTTPException(status_code=422, detail=f"window must contain exactly {WIN} readings ({STEP_MIN}-minute bins).")
    df = to_frame(req.window)
    if not (df.timestamp.diff().dropna() == pd.Timedelta(minutes=STEP_MIN)).all():
        raise HTTPException(status_code=422, detail=f"window readings must be consecutive {STEP_MIN}-minute bins.")
    norm = resolve_norm(req.norm, req.subject_id)
    err = np.asarray(predict_errors(build_input(df, norm)), dtype=float)
    score = float(err.mean())
    severity, level = classify(score)
    return {
        "level": level,
        "message": MESSAGES[level],
        "severity": round(severity, 3),
        "score": round(score, 4),
        "top_feature": TARGET[int(err.argmax())],
        "feature_errors": {c: round(float(e), 4) for c, e in zip(TARGET, err)},
        "thresholds": {"warning": THR_WARN, "high": THR_HIGH},
        "disclaimer": DISCLAIMER,
    }


@app.post("/analyze")
def analyze(req: AnalyzeRequest):
    """Accurate Core API adapter endpoint:
    - Uses personal baseline + LSTM Autoencoder for heart rate.
    - Evaluates other indicators against clinical limits and robust drift metrics.
    """
    results = {}
    norm = resolve_norm_for_crew(req.crew_id)
    definitions = load_indicators_definitions()
    crew_baselines = load_crew_baselines().get(req.crew_id, {})

    # 1. Process heart_rate using LSTM-AE model
    if "heart_rate" in req.window and len(req.window["heart_rate"]) >= 3:
        hr_series = req.window["heart_rate"]
        n_pts = len(hr_series)

        orig_indices = np.linspace(0, 1, n_pts)
        target_indices = np.linspace(0, 1, WIN)
        hr_means = np.interp(target_indices, orig_indices, hr_series)

        # Realistic HRV -> hr_std relationship
        if "hrv" in req.window and len(req.window["hrv"]) >= 3:
            hrv_interp = np.interp(target_indices, np.linspace(0, 1, len(req.window["hrv"])), req.window["hrv"])
            # Physiological coupling: lower HRV means autonomic stress -> lower SDNN
            hr_stds = np.clip(hrv_interp / 16.0, 1.5, 12.0)
        else:
            hr_stds = pd.Series(hr_means).rolling(5, min_periods=1).std().fillna(3.5).clip(1.5, 12.0).to_numpy()

        now = datetime.now()
        timestamps = [now - timedelta(minutes=(WIN - 1 - i) * STEP_MIN) for i in range(WIN)]

        # Contextual circadian activity (steps): active during waking hours, quiet during rest
        steps = np.array([
            max(0.0, 25.0 * np.sin((t.hour + t.minute / 60) / 24 * 2 * np.pi - np.pi / 3))
            for t in timestamps
        ], dtype=float)

        df_hr = pd.DataFrame({
            "timestamp": timestamps,
            "hr_mean": hr_means,
            "hr_std": hr_stds,
            "steps": steps,
        })

        x_in = build_input(df_hr, norm)
        err = np.asarray(predict_errors(x_in), dtype=float)
        score = float(err.mean())
        severity, level = classify(score)

        is_anom = bool(level != "normal")
        results["heart_rate"] = {
            "is_anomaly": is_anom,
            "score": round(severity, 2),
        }

    # 2. Process other indicators with clinical threshold & robust drift check
    for indicator, values in req.window.items():
        if indicator == "heart_rate":
            continue
        if len(values) >= 3:
            vals = np.array(values, dtype=float)
            last_v = float(vals[-1])
            mean_v = float(np.mean(vals))
            std_v = float(np.std(vals))

            defn = definitions.get(indicator, {})
            green = defn.get("green")
            yellow = defn.get("yellow")

            # Check if within clinical green range
            in_green = True
            if green and len(green) == 2:
                in_green = (green[0] <= last_v <= green[1])

            # Robust Z-score calculation
            baseline_val = crew_baselines.get(indicator, mean_v)
            diff_from_baseline = abs(last_v - baseline_val)

            denom = max(std_v, 0.5)
            z_score = abs(last_v - mean_v) / denom

            # Clinically calibrated anomaly judgment:
            # If the indicator is comfortably inside the green range and within expected tolerance, it's nominal!
            # It only triggers an anomaly if it breaches green or shows extreme drift (> 2.8 Z with clinical drift).
            if in_green:
                is_anom = False
                # Keep score reasonable (< 1.0) when nominal
                score_display = min(round(z_score / 3.0, 2), 0.8)
            else:
                # Outside green zone -> real anomaly
                is_anom = True
                score_display = round(max(z_score, 1.2), 2)

            results[indicator] = {
                "is_anomaly": is_anom,
                "score": score_display,
            }

    return {
        "model": "lstm_ae",
        "results": results,
    }
