import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '@/components/common/Card.jsx';
import { Icon } from '@/components/common/Icons.jsx';
import { useCrew } from '@/context/CrewContext.jsx';
import { ask } from '@/services/assistantService.js';

export default function AssistantPage() {
  const { selected, selectedId } = useCrew();
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const threadEndRef = useRef(null);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, busy]);

  const onAsk = async (event) => {
    event.preventDefault();
    const text = question.trim();
    if (!text) return setError(new Error('Please type a clinical question or symptom description.'));
    setError(null);
    setBusy(true);
    setQuestion('');
    const history = messages.map(({ role, content }) => ({ role, content }));
    setMessages((current) => [...current, { role: 'user', content: text }]);
    try {
      const reply = await ask(selectedId, text, history);
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: reply.answer,
          sources: reply.sources,
          model: reply.model,
        },
      ]);
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
    <div className="assistant-page-container">
      {/* Header */}
      <header className="page-header-standard">
        <div className="page-header-icon-box">
          <Icon name="assistant" size={24} color="var(--cyan)" />
        </div>
        <div>
          <h1 className="page-title">Clinical Medical Assistant</h1>
          <p className="page-subtitle muted">
            On-board NASA flight medicine guidance. Answers cite official NASA technical documents.
            For skin or wound imaging, use <Link to="/photo-check" className="text-cyan underline">Photo check</Link>.
            For life-critical emergencies, use <Link to="/emergency" className="text-coral underline">Emergency Mode</Link>.
          </p>
        </div>
      </header>

      {/* Chat Thread */}
      <div className="chat-thread-container">
        {messages.length === 0 && (
          <div className="chat-welcome-card">
            <Icon name="assistant" size={32} color="var(--cyan)" />
            <h3>How can I assist your health today?</h3>
            <p className="muted small">
              Describe a symptom, inquire about space adaptation syndrome, medication dosages, or exercise countermeasure protocols.
            </p>
          </div>
        )}

        {messages.map((message, index) =>
          message.role === 'user' ? (
            <div key={index} className="chat-bubble-row user-bubble-row">
              <div className="chat-bubble user-bubble">
                <p className="chat-message-text">{message.content}</p>
              </div>
            </div>
          ) : (
            <div key={index} className="chat-bubble-row assistant-bubble-row">
              <div className="chat-bubble assistant-bubble">
                <div className="bubble-header-row">
                  <span className="bubble-assistant-tag">
                    <Icon name="assistant" size={14} color="var(--cyan)" />
                    <span>AstroHealth Medical AI</span>
                  </span>
                  {message.model && (
                    <span className="bubble-model-chip muted small">
                      Model: {message.model}
                    </span>
                  )}
                </div>
                <p className="chat-message-text prewrap">{message.content}</p>

                {/* Sources list */}
                {message.sources && message.sources.length > 0 && (
                  <div className="chat-sources-block">
                    <h4 className="sources-title">
                      <Icon name="book" size={13} />
                      <span>Verified NASA Reference Sources:</span>
                    </h4>
                    <div className="sources-list">
                      {message.sources.map((source, sourceIndex) => (
                        <div key={sourceIndex} className="source-item">
                          <strong className="source-name">{source.title}</strong>
                          <p className="source-snippet muted small">{source.snippet}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ),
        )}

        {busy && (
          <div className="chat-bubble-row assistant-bubble-row">
            <div className="chat-bubble assistant-bubble thinking-bubble">
              <div className="typing-dots">
                <span /><span /><span />
              </div>
              <span className="muted small">Searching flight medicine documentation…</span>
            </div>
          </div>
        )}
        <div ref={threadEndRef} />
      </div>

      {/* Robust Input Form Card */}
      <Card className="chat-input-card">
        <form onSubmit={onAsk} className="chat-form">
          <div className="chat-input-wrap">
            <textarea
              id="question"
              rows={2}
              placeholder={messages.length === 0 ? 'Describe a symptom or clinical question…' : 'Ask a follow-up question…'}
              className="chat-textarea"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onAsk(e);
                }
              }}
            />
          </div>

          <div className="chat-actions-row">
            <button
              type="submit"
              className="button primary-gradient-btn"
              disabled={busy || !question.trim()}
            >
              <Icon name="quick" size={16} color="#070C15" />
              <span>{busy ? 'Consulting…' : 'Send Question'}</span>
            </button>

            {messages.length > 0 && (
              <button
                type="button"
                className="button ghost"
                onClick={onNewChat}
                disabled={busy}
              >
                Clear Conversation
              </button>
            )}
          </div>
          {error && <p className="error small mt-2">{error.message}</p>}
        </form>
      </Card>
    </div>
  );
}
