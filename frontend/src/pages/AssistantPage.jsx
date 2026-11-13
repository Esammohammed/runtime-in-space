import { useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '@/components/common/Card.jsx';
import { useCrew } from '@/context/CrewContext.jsx';
import { ask } from '@/services/assistantService.js';

export default function AssistantPage() {
  const { selectedId } = useCrew();
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const onAsk = async (event) => {
    event.preventDefault();
    const text = question.trim();
    if (!text) return setError(new Error('Type a question first.'));
    setError(null);
    setBusy(true);
    setQuestion('');
    const history = messages.map(({ role, content }) => ({ role, content }));
    setMessages((current) => [...current, { role: 'user', content: text }]);
    try {
      const reply = await ask(selectedId, text, history);
      setMessages((current) => [...current, { role: 'assistant', content: reply.answer, sources: reply.sources, model: reply.model }]);
    } catch (askError) {
      setError(askError);
    } finally {
      setBusy(false);
    }
  };

  const onNewChat = () => {
    setMessages([]);
    setError(null);
  };

  return (
    <>
      <h1>Assistant</h1>
      <p className="muted">
        Answers come from the NASA documents on board and name their source. This chat
        is not saved anywhere -- it resets if you reload the page. For a skin or wound
        photo, use <Link to="/photo-check">Photo check</Link> instead. For an emergency,
        use the Emergency button: those steps are fixed protocols.
      </p>

      {messages.length === 0 && (
        <Card><p className="muted">Describe a symptom or ask a question to start.</p></Card>
      )}

      {messages.map((message, index) => (
        message.role === 'user' ? (
          <Card key={index} className="chat-message chat-user">
            <p className="prewrap">{message.content}</p>
          </Card>
        ) : (
          <Card key={index} className="chat-message chat-assistant" aside={`Model: ${message.model}`}>
            <p className="prewrap">{message.content}</p>
            {message.sources && message.sources.length > 0 && (
              <>
                <h3>Sources</h3>
                {message.sources.map((source, sourceIndex) => (
                  <p key={sourceIndex} className="small"><strong>{source.title}</strong> — {source.snippet}</p>
                ))}
              </>
            )}
            {message.sources && message.sources.length === 0 && (
              <p className="muted small">No source documents matched this question.</p>
            )}
          </Card>
        )
      ))}

      <Card>
        <form onSubmit={onAsk} className="form">
          <div className="field">
            <label htmlFor="question">{messages.length === 0 ? 'Describe a symptom or ask a question' : 'Ask a follow-up'}</label>
            <textarea id="question" rows="3" value={question} onChange={(event) => setQuestion(event.target.value)} />
          </div>
          <div className="row wrap">
            <button type="submit" className="button" disabled={busy}>{busy ? 'Thinking…' : 'Send'}</button>
            {messages.length > 0 && (
              <button type="button" className="button ghost" onClick={onNewChat} disabled={busy}>Start a new chat</button>
            )}
          </div>
          {error && <p className="error">{error.message}</p>}
        </form>
      </Card>
    </>
  );
}
