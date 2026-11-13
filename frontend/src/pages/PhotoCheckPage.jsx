import { useEffect, useState } from 'react';
import Card from '@/components/common/Card.jsx';
import { useCrew } from '@/context/CrewContext.jsx';
import { analyzeImage, fetchSampleImage, listSampleImages } from '@/services/assistantService.js';

const URGENCY_LABELS = {
  watch: 'Keep watching',
  show_officer: 'Show the crew medical officer',
  alert_ground: 'Send to flight surgeons',
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

  useEffect(() => {
    listSampleImages().then(setSamples).catch(() => setSamples([]));
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
    run(async () => setResult(await analyzeImage(selectedId, await toBase64(file), file.type, note.trim())));
  };

  const onSample = (name) => {
    run(async () => {
      const blob = await fetchSampleImage(name);
      setResult(await analyzeImage(selectedId, await toBase64(blob), blob.type, note.trim()));
    });
  };

  return (
    <>
      <h1>Photo check</h1>
      <p className="muted">
        One photo, one finding -- described and labelled with an urgency level. This is
        separate from the chat assistant: no back-and-forth, no diagnosis, just what the
        model sees and what to do next.
      </p>
      <Card>
        <div className="form">
          <div className="field">
            <label htmlFor="note">Note for the model <span className="muted">(optional)</span></label>
            <textarea id="note" rows="2" value={note} onChange={(event) => setNote(event.target.value)} />
          </div>
          <div className="row wrap">
            <label className="button ghost">
              Analyze a photo
              <input type="file" accept="image/*" capture="environment" hidden onChange={onPhoto} disabled={busy} />
            </label>
          </div>
          {samples.length > 0 && (
            <div className="row wrap">
              <span className="muted small">Or try a sample:</span>
              {samples.map((name) => (
                <button key={name} type="button" className="button ghost" disabled={busy} onClick={() => onSample(name)}>
                  {name}
                </button>
              ))}
            </div>
          )}
          {error && <p className="error">{error.message}</p>}
        </div>
      </Card>
      {result && (
        <Card title="Finding" aside={`Model: ${result.model}`}>
          <p>{result.description}</p>
          <p><strong>Next step:</strong> {result.next_step}</p>
          <p><strong>Urgency:</strong> {URGENCY_LABELS[result.urgency] ?? result.urgency}</p>
        </Card>
      )}
    </>
  );
}
