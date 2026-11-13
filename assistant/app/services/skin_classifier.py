"""Local skin-condition classifier: a vendored, pinned MobileNetV2 ONNX model,
five classes (four conditions plus Normal Skin). Runs fully offline, no network
calls, independent of app/services/llm.py's vision model.

Vendored from https://github.com/Vishal123-tech/AI-Skin-Disease-Detection-System
(commit 6ec0a12) -- see app/ml/skin_model/NOTICE.md. That project's own README
calls it an "educational prototype, not a medical diagnostic device". This
module never raises: a missing dependency, a missing/corrupt model file, or an
unreadable image all degrade to classify() returning None, so a classifier
problem never breaks the rest of /analyze-image.
"""
import logging
from functools import lru_cache
from io import BytesIO
from pathlib import Path

from app.schemas.assistant import SkinClassPrediction, SkinClassification

log = logging.getLogger(__name__)

MODEL_DIR = Path(__file__).resolve().parents[1] / "ml" / "skin_model"
INPUT_NAME = "image"  # the ONNX graph's input tensor name, fixed by the export
DISCLAIMER = ("Experimental prototype model, not a medical diagnosis. Treat a low "
              "confidence or an unclear photo as inconclusive, not reassuring.")


@lru_cache
def _labels() -> list[str]:
    return MODEL_DIR.joinpath("labels.txt").read_text(encoding="utf-8").splitlines()


@lru_cache
def _session():
    try:
        import onnxruntime as ort
    except ImportError as exc:
        log.warning("onnxruntime not installed; skin classifier disabled (%s).", exc)
        return None
    model_path = MODEL_DIR / "model.onnx"
    if not model_path.exists():
        log.warning("Skin model artifact missing at %s; classifier disabled.", model_path)
        return None
    return ort.InferenceSession(str(model_path), providers=["CPUExecutionProvider"])


def _prepare(image_bytes: bytes):
    """Match the pinned preprocessing recorded in app/ml/skin_model/runtime.json
    (input_preprocessing: imagenet_rgb_exif_resize256_centercrop224): EXIF-correct
    orientation, RGB, resize shorter side to 256, center-crop 224, ImageNet
    mean/std normalize, NCHW."""
    import numpy as np
    from PIL import Image, ImageOps

    with Image.open(BytesIO(image_bytes)) as source:
        image = ImageOps.exif_transpose(source).convert("RGB")
    width, height = image.size
    resized = (256, round(256 * height / width)) if width <= height else (round(256 * width / height), 256)
    image = image.resize(resized, Image.Resampling.BILINEAR)
    left, top = round((resized[0] - 224) / 2), round((resized[1] - 224) / 2)
    image = image.crop((left, top, left + 224, top + 224))
    tensor = np.asarray(image, dtype=np.float32).transpose(2, 0, 1) / np.float32(255.0)
    mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)[:, None, None]
    std = np.array([0.229, 0.224, 0.225], dtype=np.float32)[:, None, None]
    return np.ascontiguousarray(((tensor - mean) / std)[None])


def classify(image_bytes: bytes) -> SkinClassification | None:
    """None when the model isn't available (dependency/artifact missing) or the
    photo can't be decoded. Otherwise the model's own softmax probabilities --
    real numbers, not invented -- for all five labels, ranked."""
    session = _session()
    if session is None:
        return None
    try:
        tensor = _prepare(image_bytes)
        probabilities = session.run(None, {INPUT_NAME: tensor})[0][0]
    except Exception as exc:  # corrupt/undecodable image, bad model output, etc.
        log.warning("Skin classifier inference failed (%s).", exc)
        return None
    ranked = sorted(zip(_labels(), (float(p) for p in probabilities)), key=lambda item: item[1], reverse=True)
    top_label, top_confidence = ranked[0]
    top3 = [SkinClassPrediction(label=label, confidence=confidence) for label, confidence in ranked[:3]]
    return SkinClassification(label=top_label, confidence=top_confidence, top3=top3, disclaimer=DISCLAIMER)
