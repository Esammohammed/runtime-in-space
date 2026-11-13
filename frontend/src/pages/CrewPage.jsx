import { useEffect, useState } from 'react';
import Card from '@/components/common/Card.jsx';
import { useCrew } from '@/context/CrewContext.jsx';
import { createReport, listReports } from '@/services/crewService.js';
import { listEvents } from '@/services/eventsService.js';

const formatTime = (iso) => new Date(iso).toLocaleString();

export default function CrewPage() {
  const { selected, selectedId } = useCrew();
  const [reports, setReports] = useState([]);
  const [events, setEvents] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!selectedId) return;
    Promise.all([listReports(selectedId), listEvents(selectedId)])
      .then(([reportList, eventList]) => {
        setReports(reportList);
        setEvents(eventList);
      })
      .catch(setError);
  }, [selectedId]);

  const onReport = async () => {
    setBusy(true);
    setError(null);
    try {
      const report = await createReport(selectedId);
      setReports((current) => [report, ...current]);
    } catch (reportError) {
      setError(reportError);
    } finally {
      setBusy(false);
    }
  };

  if (!selected) return <p className="muted">Loading…</p>;

  return (
    <>
      <h1>{selected.name}</h1>
      <p className="muted">{selected.role}{selected.age ? ` · ${selected.age} years` : ''}</p>
      {error && <p className="error">{error.message}</p>}

      <Card title="Personal baselines" aside="This person's own normal values">
        <div className="baseline-grid">
          {Object.entries(selected.baselines ?? {}).map(([id, value]) => (
            <div key={id}><span className="muted small">{id.replaceAll('_', ' ')}</span><br />{value}</div>
          ))}
        </div>
      </Card>

      <Card title="Reports for Earth" aside={`${reports.length} so far`}>
        <button type="button" className="button" onClick={onReport} disabled={busy}>
          {busy ? 'Writing the report…' : 'Generate a report for flight surgeons'}
        </button>
        {reports.map((report) => (
          <article key={report.id} className="report">
            <p className="muted small">{formatTime(report.created_at)} · {report.state}</p>
            <p className="prewrap">{report.text}</p>
          </article>
        ))}
      </Card>

      <Card title="Event log" aside="Newest first">
        {events.length === 0 && <p className="muted">Nothing logged yet.</p>}
        {events.map((event) => (
          <p key={event.id} className="small">
            <span className="muted">{formatTime(event.timestamp)} · {event.type.replaceAll('_', ' ')}</span><br />
            {event.message}
          </p>
        ))}
      </Card>
    </>
  );
}
