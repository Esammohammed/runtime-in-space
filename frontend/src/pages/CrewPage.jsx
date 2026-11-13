import { useEffect, useState } from 'react';
import Card from '@/components/common/Card.jsx';
import { Icon } from '@/components/common/Icons.jsx';
import { useCrew } from '@/context/CrewContext.jsx';
import { createReport, listReports } from '@/services/crewService.js';
import { listEvents } from '@/services/eventsService.js';

const formatTime = (iso) => (iso ? new Date(iso).toLocaleString() : '—');

export default function CrewPage() {
  const { selected, selectedId, switchIdentity } = useCrew();
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

  if (!selected) {
    return (
      <div className="state-card loading-card">
        <div className="loading-spinner" />
        <p className="muted">Loading astronaut dossier…</p>
      </div>
    );
  }

  // Comprehensive baseline metrics with fallbacks
  const baselinesData = [
    { label: 'Resting Heart Rate', val: `${selected.baselines?.heart_rate ?? 62} bpm`, icon: 'heart' },
    { label: 'Baseline Systolic BP', val: '118 mmHg', icon: 'gauge' },
    { label: 'Fasting Blood Glucose', val: '92 mg/dL', icon: 'blood_glucose' },
    { label: 'Normal Blood Oxygen (SpO2)', val: '98 %', icon: 'droplet' },
    { label: 'Baseline Body Temperature', val: '36.6 °C', icon: 'thermometer' },
    { label: 'Target Sleep Duration', val: '8.0 hours', icon: 'moon' },
  ];

  return (
    <div className="crew-page-layout">
      {/* Crew Profile Hero Header Card */}
      <Card className="crew-hero-card">
        <div className="crew-hero-content">
          <div className="crew-avatar-large">
            <span>{selected.name?.slice(0, 2).toUpperCase() || 'CR'}</span>
          </div>

          <div className="crew-hero-text">
            <div className="crew-title-row">
              <h1 className="crew-name-heading">{selected.name}</h1>
              <span className="crew-role-pill">{selected.role || 'Astronaut'}</span>
            </div>
            <div className="crew-details-row muted small">
              <span>Age: {selected.age ? `${selected.age} Earth years` : '38 Earth years'}</span>
              <span className="chip-divider">·</span>
              <span>Mission: Mars Transit Expedition</span>
              <span className="chip-divider">·</span>
              <span className="text-green font-semibold">✓ Flight Medical Clearance: Active</span>
            </div>
          </div>

          <div className="crew-hero-actions">
            <button
              type="button"
              className="button ghost switch-identity-btn"
              onClick={switchIdentity}
            >
              <Icon name="user" size={15} />
              <span>Switch Astronaut</span>
            </button>
          </div>
        </div>
      </Card>

      {error && (
        <div className="form-error-banner" role="alert">
          <Icon name="alert-triangle" size={16} color="var(--coral)" />
          <span>{error.message}</span>
        </div>
      )}

      {/* Two-Column Responsive Layout */}
      <div className="crew-columns-grid">
        {/* Left Column: Baselines & Mission Profile */}
        <div className="crew-left-col">
          {/* Physiological Baselines */}
          <Card
            title="Individual Physiological Baselines"
            icon={<Icon name="activity" size={18} color="var(--cyan)" />}
            aside="Ground Pre-Flight Calibrations"
            className="crew-baselines-card"
          >
            <p className="muted small mb-3">
              Calibrated resting values measured on Earth prior to transit insertion. Used by telemetry algorithms to detect individual anomaly drifts.
            </p>
            <div className="crew-baseline-tiles-grid">
              {baselinesData.map((item) => (
                <div key={item.label} className="crew-baseline-tile">
                  <div className="tile-top-line">
                    <span className="tile-icon">
                      <Icon name={item.icon} size={15} />
                    </span>
                    <span className="tile-metric-name muted small">{item.label}</span>
                  </div>
                  <strong className="tile-metric-value font-mono">{item.val}</strong>
                </div>
              ))}
            </div>
          </Card>

          {/* Mission Health Summary */}
          <Card
            title="Mission Exposure Parameters"
            icon={<Icon name="shield" size={18} color="var(--cyan)" />}
            className="crew-exposure-card"
          >
            <div className="exposure-metrics-list">
              <div className="exposure-item">
                <span className="muted small">Cumulative Radiation Exposure</span>
                <strong className="font-mono">42.8 mSv / 100 mSv max</strong>
              </div>
              <div className="exposure-item">
                <span className="muted small">Microgravity Resistance Protocols</span>
                <strong className="text-green font-mono">100% compliant (2 hrs/day)</strong>
              </div>
              <div className="exposure-item">
                <span className="muted small">Next Scheduled Ground Consult</span>
                <strong className="font-mono">Flight Day 130 (in 6 days)</strong>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Reports for Earth & Event Log */}
        <div className="crew-right-col">
          {/* Reports for Earth */}
          <Card
            title="Medical Reports for Flight Surgeons"
            icon={<Icon name="guide" size={18} color="var(--cyan)" />}
            aside={`${reports.length} report${reports.length === 1 ? '' : 's'}`}
            className="crew-reports-card"
          >
            <div className="reports-action-bar">
              <p className="muted small">
                Consolidates recent continuous telemetry, manual check-in scores, and early warnings into a ground packet.
              </p>
              <button
                type="button"
                className="button primary-gradient-btn"
                onClick={onReport}
                disabled={busy}
              >
                <Icon name="quick" size={15} color="#070C15" />
                <span>{busy ? 'Synthesizing report…' : 'Compile Medical Report for Ground'}</span>
              </button>
            </div>

            <div className="reports-feed-list mt-3">
              {reports.map((report) => (
                <article key={report.id} className="report-item-card">
                  <div className="report-header-line">
                    <span className="report-timestamp muted small font-mono">
                      {formatTime(report.created_at)}
                    </span>
                    <span className={`report-state-pill state-${report.state}`}>
                      {report.state}
                    </span>
                  </div>
                  <p className="report-body-text prewrap">{report.text}</p>
                </article>
              ))}
              {reports.length === 0 && (
                <div className="empty-reports-box">
                  <p className="muted small">No clinical reports compiled yet for this astronaut.</p>
                </div>
              )}
            </div>
          </Card>

          {/* Medical Event Log */}
          <Card
            title="Telemetry & Intervention Log"
            icon={<Icon name="checkin" size={18} color="var(--cyan)" />}
            aside="Chronological record"
            className="crew-events-card"
          >
            <div className="events-timeline">
              {events.length === 0 && (
                <p className="muted small">No medical events logged yet.</p>
              )}
              {events.map((event) => (
                <div key={event.id} className="event-timeline-item">
                  <span className="event-dot" />
                  <div className="event-content">
                    <div className="event-meta-line">
                      <span className="event-type-tag">{event.type?.replaceAll('_', ' ')}</span>
                      <span className="event-timestamp muted small font-mono">{formatTime(event.timestamp)}</span>
                    </div>
                    <p className="event-message-text">{event.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
