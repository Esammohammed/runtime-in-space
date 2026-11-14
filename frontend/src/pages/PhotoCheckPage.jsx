import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import Card from '@/components/common/Card.jsx';
import { Icon } from '@/components/common/Icons.jsx';
import SpeakButton from '@/components/common/SpeakButton.jsx';
import { useCrew } from '@/context/CrewContext.jsx';
import { analyzeImage, downloadPhotoReport, fetchSampleImage, listSampleImages } from '@/services/assistantService.js';
import { addFinding, CLINICAL_LOCATIONS } from '@/services/clinicalFindingsService.js';

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
  const [selectedLocation, setSelectedLocation] = useState('right_hand');
  const [isPinned, setIsPinned] = useState(false);
  const [result, setResult] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [samples, setSamples] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [streamedDesc, setStreamedDesc] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  const fileInputRef = useRef(null);
  const streamTimerRef = useRef(null);

  const onNoteChange = (text) => {
    setNote(text);
    const low = text.toLowerCase();
    if (low.includes('left hand') || low.includes('left arm') || low.includes('left forearm')) {
      setSelectedLocation('left_hand');
    } else if (low.includes('right hand') || low.includes('right arm') || low.includes('hand') || low.includes('forearm') || low.includes('arm') || low.includes('wrist')) {
      setSelectedLocation('right_hand');
    } else if (low.includes('head') || low.includes('face') || low.includes('eye') || low.includes('forehead')) {
      setSelectedLocation('head');
    } else if (low.includes('chest') || low.includes('torso') || low.includes('abdomen') || low.includes('belly')) {
      setSelectedLocation('torso');
    } else if (low.includes('left leg') || low.includes('left knee') || low.includes('left thigh')) {
      setSelectedLocation('left_leg');
    } else if (low.includes('right leg') || low.includes('leg') || low.includes('knee') || low.includes('thigh')) {
      setSelectedLocation('right_leg');
    }
  };

  useEffect(() => {
    return () => {
      if (streamTimerRef.current) clearInterval(streamTimerRef.current);
    };
  }, []);

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

  const analyze = async (blob) => {
    const base64 = await toBase64(blob);
    setPhoto({ base64, mimeType: blob.type });
    const res = await analyzeImage(selectedId, base64, blob.type, note.trim());
    setResult(res);

    // Auto-pin finding directly onto 3D Astronaut Mannequin
    const locMeta = CLINICAL_LOCATIONS[selectedLocation];
    addFinding(selectedId, {
      location: selectedLocation,
      locationLabel: locMeta?.label || 'Right Hand / Forearm',
      title: res.description
        ? (res.description.length > 50 ? res.description.slice(0, 48) + '…' : res.description)
        : 'Vision Finding',
      description: res.description,
      next_step: res.next_step,
      urgency: res.urgency,
      source: 'Photo Check (Vision AI)',
    });
    setIsPinned(true);

    // Streaming typing animation for the visual assessment description
    const fullDesc = res?.description || '';
    const words = fullDesc.split(' ');
    let index = 0;
    let currentText = '';
    setStreamedDesc('');
    setIsStreaming(true);

    if (streamTimerRef.current) clearInterval(streamTimerRef.current);
    streamTimerRef.current = setInterval(() => {
      if (index < words.length) {
        currentText += (index === 0 ? '' : ' ') + words[index];
        index++;
        setStreamedDesc(currentText);
      } else {
        clearInterval(streamTimerRef.current);
        streamTimerRef.current = null;
        setStreamedDesc(fullDesc);
        setIsStreaming(false);
      }
    }, 28);
  };

  const onPhoto = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedFileName(file.name);
    run(() => analyze(file));
  };

  const onSample = (name) => {
    setSelectedFileName(`Sample: ${name}`);
    run(async () => analyze(await fetchSampleImage(name)));
  };

  const onDownloadReport = () => {
    run(async () => {
      const pdf = await downloadPhotoReport(selectedId, photo.base64, photo.mimeType, note.trim(), result);
      const url = URL.createObjectURL(pdf);
      const link = Object.assign(document.createElement('a'), { href: url, download: 'photo-check-report.pdf' });
      link.click();
      URL.revokeObjectURL(url);
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
              onChange={(event) => onNoteChange(event.target.value)}
            />
          </div>

          {/* Anatomical Body Location Selector */}
          <div className="photo-field-group">
            <div className="photo-location-label-row">
              <label className="photo-field-label">
                Target Body Location <span className="muted small">(Maps to 3D Astronaut Hologram)</span>
              </label>
              <span className="location-active-tag">
                📍 {CLINICAL_LOCATIONS[selectedLocation]?.label}
              </span>
            </div>
            <div className="location-pills-row">
              {Object.values(CLINICAL_LOCATIONS).map((loc) => (
                <button
                  key={loc.id}
                  type="button"
                  className={`location-pill-btn ${selectedLocation === loc.id ? 'active' : ''}`}
                  onClick={() => setSelectedLocation(loc.id)}
                >
                  {loc.label}
                </button>
              ))}
            </div>
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
            {/* Hologram Pinned Alert Banner */}
            <div className="finding-pinned-banner">
              <div className="pinned-left">
                <span className="pinned-sonar-dot" />
                <div className="pinned-texts">
                  <span className="pinned-title">Mapped to 3D Hologram</span>
                  <span className="pinned-sub muted small">
                    Beacon active on <strong>{CLINICAL_LOCATIONS[selectedLocation]?.label}</strong>
                  </span>
                </div>
              </div>
              <Link to="/" className="pinned-view-link">
                <span>View on 3D Model</span>
                <Icon name="arrow-right" size={13} />
              </Link>
            </div>

            <div className="finding-urgency-banner mt-2">
              <span className="urgency-caption muted small">Triage Urgency Level:</span>
              <span className={`urgency-pill ${urgencyMeta.class}`}>
                {urgencyMeta.label}
              </span>
            </div>

            <div className="finding-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <h4 className="finding-subheading" style={{ margin: 0 }}>Visual Assessment Finding</h4>
                {!isStreaming && result && (
                  <SpeakButton
                    text={`${result.description}. Recommended next step: ${result.next_step}`}
                    label="Audio Briefing"
                  />
                )}
              </div>
              <p className="finding-text">
                {streamedDesc || result.description}
                {isStreaming && <span className="typing-cursor">▊</span>}
              </p>
            </div>

            <div className="finding-section">
              <h4 className="finding-subheading">Recommended Next Step</h4>
              <p className="finding-text font-semibold text-white">{result.next_step}</p>
            </div>

            <div className="row wrap gap-2 mt-3">
              <button type="button" className="button ghost" disabled={busy || !photo} onClick={onDownloadReport}>
                Download PDF report
              </button>
              <Link to="/" className="button primary">
                Inspect 3D Mannequin →
              </Link>
            </div>
          </div>
        </Card>
      )}
      {result?.skin_model && (
        <Card title="Skin model (experimental)" aside={`${Math.round(result.skin_model.confidence * 100)}%`}>
          <p>
            <strong>{result.skin_model.label}</strong>
          </p>
          <ul className="muted small">
            {result.skin_model.top3.map((item) => (
              <li key={item.label}>{item.label}: {Math.round(item.confidence * 100)}%</li>
            ))}
          </ul>
          <p className="muted small">{result.skin_model.disclaimer}</p>
        </Card>
      )}
    </div>
  );
}
