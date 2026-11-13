import { useState } from 'react';
import ProtocolRunner from '@/components/emergency/ProtocolRunner.jsx';
import { useCrew } from '@/context/CrewContext.jsx';
import { PROTOCOLS } from '@/data/protocols.js';
import { createReport } from '@/services/crewService.js';
import { logEvent } from '@/services/eventsService.js';

function groupByCategory(protocols) {
  const groups = new Map();
  for (const protocol of protocols) {
    const category = protocol.category ?? 'Other';
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(protocol);
  }
  return groups;
}

const IDLE_REPORT = { busy: false, report: null, error: null };

export default function EmergencyPage() {
  const { selectedId } = useCrew();
  const [protocol, setProtocol] = useState(null);
  const [reportStatus, setReportStatus] = useState(IDLE_REPORT);
  const categories = groupByCategory(PROTOCOLS);

  const start = (chosen) => {
    setProtocol(chosen);
    setReportStatus(IDLE_REPORT);
    logEvent(selectedId, `Emergency protocol started: ${chosen.title}`, { protocol: chosen.id });
  };

  // Each step is logged so the report for Earth shows exactly what was done and when.
  const onStep = (step) => logEvent(selectedId, `${step.text} → ${step.answer}`, step);

  const onGenerateReport = async () => {
    setReportStatus({ busy: true, report: null, error: null });
    try {
      const report = await createReport(selectedId);
      setReportStatus({ busy: false, report, error: null });
    } catch (error) {
      setReportStatus({ busy: false, report: null, error });
    }
  };

  return (
    <div className="emergency">
      <h1>Emergency</h1>
      {!protocol && (
        <>
          <p>What is happening?</p>
          {[...categories.entries()].map(([category, items]) => (
            <div key={category}>
              <p className="protocol-category">{category}</p>
              <div className="protocol-list">
                {items.map((item) => (
                  <button key={item.id} type="button" className="button big" onClick={() => start(item)}>{item.title}</button>
                ))}
              </div>
            </div>
          ))}
          <p className="muted small">
            These steps are fixed protocols bundled with the app. They work with no connection.
          </p>
        </>
      )}
      {protocol && (
        <ProtocolRunner protocol={protocol} onStep={onStep} onExit={() => setProtocol(null)}
          onGenerateReport={onGenerateReport} reportStatus={reportStatus} />
      )}
    </div>
  );
}
