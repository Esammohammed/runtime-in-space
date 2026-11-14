import { useEffect, useRef, useState } from 'react';
import Card from '@/components/common/Card.jsx';
import { Icon } from '@/components/common/Icons.jsx';
import FormattedReport from '@/components/common/FormattedReport.jsx';
import SpeakButton from '@/components/common/SpeakButton.jsx';
import { useCrew } from '@/context/CrewContext.jsx';
import { createReport, listReports } from '@/services/crewService.js';
import { listEvents } from '@/services/eventsService.js';

const formatTime = (iso) => (iso ? new Date(iso).toLocaleString() : '—');

export default function CrewPage() {
  const { selected, selectedId, switchIdentity } = useCrew();
  const [reports, setReports] = useState([]);
  const [events, setEvents] = useState([]);
  const [activeReportId, setActiveReportId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [streamingReportId, setStreamingReportId] = useState(null);
  const [streamingText, setStreamingText] = useState('');
  const streamTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (streamTimerRef.current) clearInterval(streamTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    Promise.all([listReports(selectedId), listEvents(selectedId)])
      .then(([reportList, eventList]) => {
        setReports(reportList);
        setEvents(eventList);
        if (reportList && reportList.length > 0) {
          setActiveReportId(reportList[0].id);
        }
      })
      .catch(setError);
  }, [selectedId]);

  const onReport = async () => {
    setBusy(true);
    setError(null);
    try {
      const report = await createReport(selectedId);
      setReports((current) => [report, ...current]);
      setActiveReportId(report.id);

      // Start live streaming typewriter effect for the newly compiled report
      const fullText = report.text || '';
      const tokens = fullText.match(/\S+|\s+/g) || [];
      let index = 0;
      let currentText = '';

      setStreamingReportId(report.id);
      setStreamingText('');

      if (streamTimerRef.current) clearInterval(streamTimerRef.current);
      streamTimerRef.current = setInterval(() => {
        if (index < tokens.length) {
          currentText += tokens[index];
          index++;
          setStreamingText(currentText);
        } else {
          clearInterval(streamTimerRef.current);
          streamTimerRef.current = null;
          setStreamingReportId(null);
          setStreamingText('');
        }
      }, 15);
    } catch (reportError) {
      setError(reportError);
    } finally {
      setBusy(false);
    }
  };

  const toggleExpand = (id) => {
    setActiveReportId((current) => (current === id ? null : id));
  };

  const copyReport = (report, e) => {
    e.stopPropagation();
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(report.text);
      setCopiedId(report.id);
      setTimeout(() => setCopiedId(null), 2000);
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
              {reports.map((report, index) => {
                const isExpanded = activeReportId === report.id;
                const isCopied = copiedId === report.id;
                const reportNum = reports.length - index;
                return (
                  <article
                    key={report.id}
                    className={`report-item-card ${isExpanded ? 'is-expanded' : 'is-collapsed'}`}
                  >
                    <header
                      className="report-item-header"
                      onClick={() => toggleExpand(report.id)}
                    >
                      <div className="report-header-left">
                        <span className="report-expand-icon">
                          <Icon
                            name={isExpanded ? 'chevron-down' : 'chevron-right'}
                            size={14}
                            color="var(--cyan)"
                          />
                        </span>
                        <div className="report-header-titles">
                          <span className="report-badge-num">Report #{reportNum}</span>
                          <strong className="report-title-label font-mono">
                            {formatTime(report.created_at)}
                          </strong>
                          <span className={`report-state-pill state-${report.state}`}>
                            {report.state || 'ready'}
                          </span>
                        </div>
                      </div>

                      <div className="report-header-actions" onClick={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {report.text && (
                          <SpeakButton text={report.text} label="Audio Report" />
                        )}
                        <button
                          type="button"
                          className="report-copy-btn"
                          title="Copy Report to Clipboard"
                          onClick={(e) => copyReport(report, e)}
                        >
                          <Icon
                            name={isCopied ? 'check' : 'clipboard'}
                            size={13}
                            color={isCopied ? 'var(--green)' : 'currentColor'}
                          />
                          <span>{isCopied ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </header>

                    {isExpanded && (
                      <div className="report-expanded-content">
                        <FormattedReport
                          text={streamingReportId === report.id ? streamingText : report.text}
                          isStreaming={streamingReportId === report.id}
                        />
                      </div>
                    )}
                  </article>
                );
              })}
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
