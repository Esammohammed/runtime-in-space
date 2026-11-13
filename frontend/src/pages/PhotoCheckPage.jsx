import { useEffect, useState, useRef } from 'react';
import Card from '@/components/common/Card.jsx';
import { Icon } from '@/components/common/Icons.jsx';
import { useCrew } from '@/context/CrewContext.jsx';
import { analyzeImage, fetchSampleImage, listSampleImages } from '@/services/assistantService.js';

const URGENCY_CONFIG = {
  watch: { label: 'Keep Watching', color: 'var(--amber)', class: 'status-yellow' },
  show_officer: { label: 'Show Crew Medical Officer', color: 'var(--amber)', class: 'status-yellow' },
  alert_ground: { label: 'Alert Flight Surgeons (Earth)', color: 'var(--coral)', class: 'status-red' },
};

const toBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export default function PhotoCheckPage() {
  const { selectedId } = useCrew();
  const [note, setNote] = useState('');
  const [result, setResult] = useState(null);
  const [samples, setSamples] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState('');

  const fileInputRef = useRef(null);

  useEffect(() => {
    listSampleImages()
      .then(setSamples)
      .catch(() => setSamples([]));
  }, []);

  const run = async (action) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (actionError) {
      setError(actionError);
    } finally {
      setBusy(false);
    }
  };

  const onPhoto = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedFileName(file.name);
    run(async () =>
      setResult(await analyzeImage(selectedId, await toBase64(file), file.type, note.trim())),
    );
  };

  const onSample = (name) => {
    setSelectedFileName(`Sample: ${name}`);
    run(async () => {
      const blob = await fetchSampleImage(name);
      setResult(await analyzeImage(selectedId, await toBase64(blob), blob.type, note.trim()));
    });
  };

  const urgencyMeta = result
    ? URGENCY_CONFIG[result.urgency] || { label: result.urgency, color: 'var(--cyan)', class: 'status-cyan' }
    : null;

  return (
    <div className="photocheck-page-container">
      {/* Header */}
      <header className="page-header-standard">
        <div className="page-header-icon-box">
          <Icon name="photo" size={24} color="var(--cyan)" />
        </div>
        <div>
          <h1 className="page-title">Dermatology & Wound Photo Check</h1>
          <p className="page-subtitle muted">
            Upload or capture an image of a rash, lesion, or wound. The vision model analyzes visual patterns and recommends a triage urgency level.
          </p>
        </div>
      </header>

      {/* Main Form Card */}
      <Card
        title="Capture or Select Image"
        icon={<Icon name="camera" size={18} color="var(--cyan)" />}
        className="photo-input-card"
      >
        <div className="photo-form-stack">
          {/* Note Input */}
          <div className="photo-field-group">
            <label htmlFor="note" className="photo-field-label">
              Clinical Context / Note <span className="muted small">(optional)</span>
            </label>
            <textarea
              id="note"
              rows={2}
              placeholder="e.g. onset 2 days ago, mild pruritus, location right forearm…"
              className="photo-textarea"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>

          {/* Upload Drop Zone / Button */}
          <div className="photo-upload-zone">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={onPhoto}
              disabled={busy}
            />

            <button
              type="button"
              className="photo-dropzone-button"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
            >
              <div className="dropzone-icon-circle">
                <Icon name="camera" size={26} color="var(--cyan)" />
              </div>
              <div className="dropzone-text-group">
                <strong className="dropzone-title">
                  {busy ? 'Analyzing image with vision model…' : 'Tap to Capture or Select Image'}
                </strong>
                <span className="dropzone-sub muted small">
                  Supports JPG, PNG, WEBP from camera or gallery
                </span>
                {selectedFileName && (
                  <span className="selected-file-badge text-cyan mt-2">
                    ✓ Selected: {selectedFileName}
                  </span>
                )}
              </div>
            </button>
          </div>

          {/* Reference Samples */}
          {samples.length > 0 && (
            <div className="sample-images-section">
              <span className="muted small">Or test with verified clinical sample:</span>
              <div className="samples-pills-row">
                {samples.map((name) => (
                  <button
                    key={name}
                    type="button"
                    className="sample-pill-btn"
                    disabled={busy}
                    onClick={() => onSample(name)}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="form-error-banner mt-2" role="alert">
              <Icon name="alert-triangle" size={16} color="var(--coral)" />
              <span>{error.message}</span>
            </div>
          )}
        </div>
      </Card>

      {/* Result Card */}
      {result && (
        <Card
          title="Diagnostic Vision Finding"
          icon={<Icon name="shield" size={18} color="var(--cyan)" />}
          aside={`Model: ${result.model}`}
          className="finding-card mt-3"
        >
          <div className="finding-body">
            <div className="finding-urgency-banner">
              <span className="urgency-caption muted small">Triage Urgency Level:</span>
              <span className={`urgency-pill ${urgencyMeta.class}`}>
                {urgencyMeta.label}
              </span>
            </div>

            <div className="finding-section">
              <h4 className="finding-subheading">Visual Assessment Finding</h4>
              <p className="finding-text">{result.description}</p>
            </div>

            <div className="finding-section">
              <h4 className="finding-subheading">Recommended Next Step</h4>
              <p className="finding-text font-semibold text-white">{result.next_step}</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
