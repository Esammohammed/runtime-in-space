# Vendored model: skin condition classifier

- Source: https://github.com/Vishal123-tech/AI-Skin-Disease-Detection-System
- Commit: `6ec0a12ca30b7ef4fc788fe279cf23b9f816c8a0`
- Vendored files: `model.onnx` (pinned five-class MobileNetV2 ONNX export),
  `labels.txt`, `runtime.json` (that repo's `models/skin_model.{onnx,runtime.json}`
  and `models/labels.txt`). Nothing else from that project -- not its Gradio/Flask
  apps, training scripts, Pi client, or the skin-gate/legacy/acne models.
- `runtime.json.sha256` is checked against `model.onnx` at classifier startup
  (see `assistant/app/services/skin_classifier.py`); verify with
  `sha256sum model.onnx` if you ever replace this file.

Per that project's own README: "educational prototype, not a medical
diagnostic device. Results can be wrong, even when confidence is high."
No standalone `LICENSE` file was present in the source repo at vendoring
time -- confirm reuse terms with its owner before any use beyond this
educational/hackathon context.
