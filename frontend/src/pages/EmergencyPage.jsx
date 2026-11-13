import { useState } from 'react';
import ProtocolRunner from '@/components/emergency/ProtocolRunner.jsx';
import { useCrew } from '@/context/CrewContext.jsx';
import { PROTOCOLS } from '@/data/protocols.js';
import { logEvent } from '@/services/eventsService.js';

export default function EmergencyPage() {
  const { selectedId } = useCrew();
  const [protocol, setProtocol] = useState(null);

  const start = (chosen) => {
    setProtocol(chosen);
    logEvent(selectedId, `Emergency protocol started: ${chosen.title}`, { protocol: chosen.id });
  };

  // Each step is logged so the report for Earth shows exactly what was done and when.
  const onStep = (step) => logEvent(selectedId, `${step.text} → ${step.answer}`, step);

  return (
    <div className="emergency">
      <h1>Emergency</h1>
      {!protocol && (
        <>
          <p>What is happening?</p>
          <div className="protocol-list">
            {PROTOCOLS.map((item) => (
              <button key={item.id} type="button" className="button big" onClick={() => start(item)}>{item.title}</button>
            ))}
          </div>
          <p className="muted small">
            These steps are fixed protocols bundled with the app. They work with no connection.
          </p>
        </>
      )}
      {protocol && <ProtocolRunner protocol={protocol} onStep={onStep} onExit={() => setProtocol(null)} />}
    </div>
  );
}
