import { useState } from 'react';
import Card from '@/components/common/Card.jsx';
import { useCrew } from '@/context/CrewContext.jsx';
import { analyzeImage, ask } from '@/services/assistantService.js';

const toBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export default function AssistantPage() {
  const { selectedId } = useCrew();
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

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

  const onAsk = (event) => {
    event.preventDefault();
    if (!question.trim()) return setError(new Error('Type a question first.'));
    run(async () => setAnswer(await ask(selectedId, question.trim())));
  };

  const onPhoto = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    run(async () => setPhoto(await analyzeImage(selectedId, await toBase64(file), file.type, question.trim())));
  };

  return (
    <>
      <h1>Assistant</h1>
      <p className="muted">
        Answers come from the NASA documents on board and name their source.
        For an emergency, use the Emergency button: those steps are fixed protocols.
      </p>
      <Card>
        <form onSubmit={onAsk} className="form">
          <div className="field">
            <label htmlFor="question">Describe a symptom or ask a question</label>
            <textarea id="question" rows="3" value={question} onChange={(event) => setQuestion(event.target.value)} />
          </div>
          <div className="row wrap">
            <button type="submit" className="button" disabled={busy}>{busy ? 'Thinking…' : 'Ask'}</button>
            <label className="button ghost">
              Analyze a photo
              <input type="file" accept="image/*" capture="environment" hidden onChange={onPhoto} />
            </label>
          </div>
          {error && <p className="error">{error.message}</p>}
        </form>
      </Card>
      {answer && (
        <Card title="Answer" aside={`Model: ${answer.model}`}>
          <p className="prewrap">{answer.answer}</p>
          <h3>Sources</h3>
          {answer.sources.length === 0 && <p className="muted">No source documents matched this question.</p>}
          {answer.sources.map((source, index) => (
            <p key={index} className="small"><strong>{source.title}</strong> — {source.snippet}</p>
          ))}
        </Card>
      )}
      {photo && (
        <Card title="Photo" aside={`Model: ${photo.model}`}>
          <p>{photo.description}</p>
          <p><strong>Next step:</strong> {photo.next_step}</p>
        </Card>
      )}
    </>
  );
}
