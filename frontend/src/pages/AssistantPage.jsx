import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '@/components/common/Card.jsx';
import { Icon } from '@/components/common/Icons.jsx';
import SpeakButton from '@/components/common/SpeakButton.jsx';
import { useCrew } from '@/context/CrewContext.jsx';
import { ask } from '@/services/assistantService.js';

export default function AssistantPage() {
  const { selected, selectedId } = useCrew();
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const threadEndRef = useRef(null);
  const streamTimerRef = useRef(null);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, busy]);

  // Clean up any ongoing typing stream on unmount
  useEffect(() => {
    return () => {
      if (streamTimerRef.current) clearInterval(streamTimerRef.current);
    };
  }, []);

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
      setBusy(false);

      // Start streaming typing animation
      const msgId = Date.now();
      const fullAnswer = reply.answer || '';
      const words = fullAnswer.split(' ');

      // Add placeholder streaming message
      setMessages((current) => [
        ...current,
        {
          id: msgId,
          role: 'assistant',
          content: '',
          sources: reply.sources,
          model: reply.model,
          isStreaming: true,
        },
      ]);

      let index = 0;
      let currentText = '';

      if (streamTimerRef.current) clearInterval(streamTimerRef.current);

      streamTimerRef.current = setInterval(() => {
        if (index < words.length) {
          currentText += (index === 0 ? '' : ' ') + words[index];
          index++;
          setMessages((current) =>
            current.map((msg) =>
              msg.id === msgId ? { ...msg, content: currentText } : msg
            )
          );
        } else {
          clearInterval(streamTimerRef.current);
          streamTimerRef.current = null;
          setMessages((current) =>
            current.map((msg) =>
              msg.id === msgId
                ? { ...msg, content: fullAnswer, isStreaming: false }
                : msg
            )
          );
        }
      }, 26); // ~38 words per second, natural conversational pace
    } catch (askError) {
      setError(askError);
      setBusy(false);
    }
  };

  const onNewChat = () => {
    if (streamTimerRef.current) clearInterval(streamTimerRef.current);
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
            <div key={message.id || index} className="chat-bubble-row user-bubble-row">
              <div className="chat-bubble user-bubble">
                <p className="chat-message-text" dir="auto">{message.content}</p>
              </div>
            </div>
          ) : (
            <div key={message.id || index} className="chat-bubble-row assistant-bubble-row">
              <div className="chat-bubble assistant-bubble">
                <div className="bubble-header-row">
                  <span className="bubble-assistant-tag">
                    <Icon name="assistant" size={14} color="var(--cyan)" />
                    <span>AstroHealth Medical AI</span>
                  </span>
                  <div className="bubble-header-actions" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {message.content && !message.isStreaming && (
                      <SpeakButton text={message.content} label="Audio Guidance" />
                    )}
                    {message.model && (
                      <span className="bubble-model-chip muted small">
                        Model: {message.model}
                      </span>
                    )}
                  </div>
                </div>

                <div className="chat-message-text prewrap" dir="auto">
                  {message.content}
                  {message.isStreaming && <span className="typing-cursor">▊</span>}
                </div>

                {/* Verified Sources — Clean citation badges, no unreadable raw text snippets */}
                {!message.isStreaming && message.sources && message.sources.length > 0 && (
                  <div className="chat-sources-block">
                    <div className="sources-header-line">
                      <Icon name="book" size={13} color="var(--cyan)" />
                      <span className="sources-title-text">Verified NASA Reference Sources:</span>
                    </div>
                    <div className="sources-pills-row">
                      {[...new Set(message.sources.map((s) => s.title))].map((title, sIdx) => (
                        <div key={sIdx} className="source-citation-pill" title={`Referenced in NASA clinical library: ${title}`}>
                          <span className="source-doc-icon">📄</span>
                          <span className="source-doc-title">{title}</span>
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
              <span className="muted small">Searching flight medicine documentation & generating answer…</span>
            </div>
          </div>
        )}
        <div ref={threadEndRef} />
      </div>

      {/* Input Form Card */}
      <Card className="chat-input-card">
        <form onSubmit={onAsk} className="chat-input-form">
          <div className="chat-input-wrapper">
            <textarea
              id="chat-question-input"
              rows={2}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (question.trim() && !busy) {
                    onAsk(e);
                  }
                }
              }}
              placeholder="Ask about symptoms, space adaptation syndrome, radiation protocols, or medication… (Press Enter to send)"
              className="chat-textarea"
              disabled={busy}
              autoFocus
            />
          </div>

          <div className="chat-actions-row">
            <button
              type="button"
              className="button ghost chat-action-btn"
              onClick={onNewChat}
              disabled={busy || messages.length === 0}
            >
              <Icon name="refresh" size={15} />
              <span>New consultation</span>
            </button>

            <button
              type="submit"
              className="button primary-gradient-btn chat-send-btn"
              disabled={busy || !question.trim()}
            >
              <Icon name="send" size={15} />
              <span>{busy ? 'Consulting…' : 'Ask Assistant'}</span>
            </button>
          </div>
        </form>

        {error && (
          <div className="chat-error-banner mt-2" role="alert">
            <Icon name="alert-triangle" size={16} color="var(--coral)" />
            <span>{error.message}</span>
          </div>
        )}
      </Card>
    </div>
  );
}
