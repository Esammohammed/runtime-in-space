import { useEffect, useState } from 'react';
import { Icon } from '@/components/common/Icons.jsx';

export default function ProtocolRunner({
  protocol,
  onStep,
  onExit,
  onGenerateReport,
  reportStatus,
}) {
  const [nodeId, setNodeId] = useState(protocol?.start || 'q1');
  const [secondsLeft, setSecondsLeft] = useState(null);

  // Keep nodeId updated if protocol changes
  useEffect(() => {
    if (protocol?.start) {
      setNodeId(protocol.start);
    }
  }, [protocol?.id, protocol?.start]);

  const nodes = protocol?.nodes || {};
  const node = nodes[nodeId] || nodes[protocol?.start] || null;

  // Handle countdown timers
  useEffect(() => {
    if (node && node.type === 'timer' && typeof node.seconds === 'number') {
      setSecondsLeft(node.seconds);
    } else {
      setSecondsLeft(null);
    }
  }, [nodeId, node]);

  useEffect(() => {
    if (secondsLeft === null || secondsLeft <= 0) return undefined;
    const timer = setTimeout(() => setSecondsLeft((val) => val - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const go = (nextId, answer) => {
    if (!nextId) {
      onExit?.();
      return;
    }
    onStep?.({
      protocol: protocol?.id,
      node: nodeId,
      text: node?.text || '',
      answer,
    });
    setNodeId(nextId);
  };

  if (!protocol || !node) {
    return (
      <div className="protocol-runner-card">
        <div className="protocol-runner-top">
          <p className="error">Protocol sequence completed or node not found.</p>
        </div>
        <button type="button" className="button ghost" onClick={onExit}>
          Return to Protocols List
        </button>
      </div>
    );
  }

  return (
    <div className="protocol-runner-card">
      {/* Header bar */}
      <div className="protocol-runner-top">
        <div className="protocol-tag-row">
          <span className="active-protocol-tag">Active Protocol</span>
          <span className="active-protocol-title">{protocol.title}</span>
        </div>
        <button
          type="button"
          className="exit-protocol-link"
          onClick={onExit}
        >
          Exit Protocol
        </button>
      </div>

      {/* Main clinical instruction display */}
      <div className="protocol-instruction-zone">
        <p className="protocol-large-text">{node.text || 'Follow standard stabilization procedure.'}</p>
      </div>

      {/* QUESTION NODE: YES / NO */}
      {node.type === 'question' && (
        <div className="protocol-actions-grid">
          <button
            type="button"
            className="protocol-action-btn btn-yes"
            onClick={() => go(node.yes, 'yes')}
          >
            <Icon name="check" size={24} color="#070C15" />
            <span>YES</span>
          </button>
          <button
            type="button"
            className="protocol-action-btn btn-no"
            onClick={() => go(node.no, 'no')}
          >
            <span>NO</span>
          </button>
        </div>
      )}

      {/* INSTRUCTION NODE: DONE */}
      {node.type === 'instruction' && (
        <div className="protocol-actions-single">
          <button
            type="button"
            className="protocol-action-btn btn-proceed"
            onClick={() => go(node.next, 'done')}
          >
            <Icon name="check" size={22} color="#070C15" />
            <span>Step Completed — Proceed</span>
          </button>
        </div>
      )}

      {/* TIMER NODE */}
      {node.type === 'timer' && (
        <div className="protocol-timer-zone">
          <div className="timer-countdown-display" aria-live="polite">
            <span className="countdown-number font-mono">{secondsLeft ?? 0}</span>
            <span className="countdown-unit">seconds remaining</span>
          </div>
          <button
            type="button"
            className="protocol-action-btn btn-proceed"
            onClick={() => go(node.next, 'done')}
          >
            <span>Proceed to Next Step</span>
          </button>
        </div>
      )}

      {/* END NODE */}
      {node.type === 'end' && (
        <div className="protocol-end-zone">
          {node.escalate ? (
            <div className="escalate-alert-box">
              <Icon name="emergency" size={28} color="var(--coral)" />
              <div>
                <strong className="alert-heading">CRITICAL ESCALATION REQUIRED</strong>
                <p>Alert Crew Medical Officer immediately and prepare telemetry transmission to Ground Surgeons.</p>
              </div>
            </div>
          ) : (
            <div className="resolved-alert-box">
              <Icon name="check" size={28} color="var(--green)" />
              <div>
                <strong className="alert-heading">Protocol Completed Nominal</strong>
                <p>Monitor crew member continuously and log observations in the telemetry record.</p>
              </div>
            </div>
          )}

          <div className="protocol-end-actions">
            <button
              type="button"
              className="button primary-gradient-btn"
              onClick={onExit}
            >
              Close Protocol & Return to List
            </button>
            {onGenerateReport && (
              <button
                type="button"
                className="button ghost"
                onClick={onGenerateReport}
                disabled={reportStatus?.busy}
              >
                {reportStatus?.busy ? 'Transmitting telemetry packet…' : 'Generate Incident Report for Ground'}
              </button>
            )}
          </div>

          {reportStatus?.error && (
            <p className="error small mt-3">{reportStatus.error.message}</p>
          )}

          {reportStatus?.report && (
            <div className="report-preview-box mt-3">
              <span className="muted small">Saved to astronaut medical file · Status: {reportStatus.report.state}</span>
              <p className="prewrap small">{reportStatus.report.text}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
