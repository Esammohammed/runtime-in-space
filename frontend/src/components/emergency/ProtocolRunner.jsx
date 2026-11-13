import { useEffect, useState } from 'react';

/**
 * Walks one protocol, one node per screen. The steps come from the protocol
 * file and are shown exactly as written. Nothing here generates text.
 */
export default function ProtocolRunner({ protocol, onStep, onExit, onGenerateReport, reportStatus }) {
  const [nodeId, setNodeId] = useState(protocol.start);
  const [secondsLeft, setSecondsLeft] = useState(null);
  const node = protocol.nodes[nodeId];

  useEffect(() => {
    setSecondsLeft(node.type === 'timer' ? node.seconds : null);
  }, [nodeId, node]);

  useEffect(() => {
    if (secondsLeft === null || secondsLeft <= 0) return undefined;
    const timer = setTimeout(() => setSecondsLeft((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const go = (nextId, answer) => {
    onStep?.({ protocol: protocol.id, node: nodeId, text: node.text, answer });
    setNodeId(nextId);
  };

  return (
    <div className="protocol">
      <p className="muted small">{protocol.title}</p>
      <p className="protocol-text">{node.text}</p>

      {node.type === 'question' && (
        <div className="protocol-actions">
          <button type="button" className="button big" onClick={() => go(node.yes, 'yes')}>Yes</button>
          <button type="button" className="button big ghost" onClick={() => go(node.no, 'no')}>No</button>
        </div>
      )}
      {node.type === 'instruction' && (
        <button type="button" className="button big" onClick={() => go(node.next, 'done')}>Done, next step</button>
      )}
      {node.type === 'timer' && (
        <>
          <p className="protocol-timer" aria-live="polite">{secondsLeft}s</p>
          <button type="button" className="button big" onClick={() => go(node.next, 'done')}>Next step</button>
        </>
      )}
      {node.type === 'end' && (
        <>
          {node.escalate && <p className="status status-red">▲ Alert the crew medical officer and report to Earth.</p>}
          <div className="protocol-actions">
            <button type="button" className="button big" onClick={onExit}>Close protocol</button>
            {onGenerateReport && (
              <button type="button" className="button big ghost" onClick={onGenerateReport} disabled={reportStatus?.busy}>
                {reportStatus?.busy ? 'Writing report…' : 'Generate report for Earth'}
              </button>
            )}
          </div>
          {reportStatus?.error && <p className="error">{reportStatus.error.message}</p>}
          {reportStatus?.report && (
            <div className="report">
              <p className="muted small">Saved to the Crew page · state: {reportStatus.report.state}</p>
              <p className="prewrap">{reportStatus.report.text}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
