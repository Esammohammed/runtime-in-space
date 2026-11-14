import { useState, useEffect } from 'react';
import { Icon } from '@/components/common/Icons.jsx';
import { speak, stopSpeaking, isSpeaking } from '@/services/speechService.js';

export default function SpeakButton({
  text,
  label = 'Listen',
  compact = false,
  className = '',
  title = 'Read aloud via flight computer audio',
}) {
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    return () => {
      // Clean up speech when this component unmounts
      if (speaking) {
        stopSpeaking();
      }
    };
  }, [speaking]);

  const handleToggle = (e) => {
    e.stopPropagation();

    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }

    if (!text) return;

    speak(text, {
      onStart: () => setSpeaking(true),
      onEnd: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  };

  return (
    <button
      type="button"
      className={`speak-btn ${speaking ? 'is-speaking' : ''} ${compact ? 'compact' : ''} ${className}`}
      onClick={handleToggle}
      title={speaking ? 'Stop audio' : title}
      aria-label={speaking ? 'Stop speech audio' : label}
    >
      <Icon
        name={speaking ? 'stop' : 'volume'}
        size={compact ? 13 : 14}
        color={speaking ? 'var(--coral)' : 'currentColor'}
      />
      {!compact && (
        <span className="speak-btn-text">
          {speaking ? 'Stop' : label}
        </span>
      )}
      {speaking && (
        <span className="sound-wave-bars" aria-hidden="true">
          <span /><span /><span />
        </span>
      )}
    </button>
  );
}
