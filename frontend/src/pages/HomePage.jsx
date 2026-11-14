import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '@/components/common/Card.jsx';
import BodyMap from '@/components/dashboard/BodyMap.jsx';
import HazardGroups from '@/components/dashboard/HazardGroups.jsx';
import TaskList from '@/components/dashboard/TaskList.jsx';
import WarningBanner from '@/components/dashboard/WarningBanner.jsx';
import VitalsPanel from '@/components/dashboard/VitalsPanel.jsx';
import { Icon } from '@/components/common/Icons.jsx';
import { POLL_INTERVAL_MS, worstStatus } from '@/constants/status.js';
import { useCrew } from '@/context/CrewContext.jsx';
import usePolling from '@/hooks/usePolling.js';
import { analyzeCrewMember, completeTask, getDashboard } from '@/services/crewService.js';
import { getFindings, removeFinding, clearFindings, subscribeFindings } from '@/services/clinicalFindingsService.js';

const DAYS_OF_WEEK = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

export default function HomePage() {
  const { selected, selectedId } = useCrew();
  const [area, setArea] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState(null);
  const [findings, setFindings] = useState([]);

  useEffect(() => {
    if (!selectedId) return;
    setFindings(getFindings(selectedId));
    return subscribeFindings((detail) => {
      if (detail.crewId === selectedId) {
        setFindings(detail.findings || []);
      }
    });
  }, [selectedId]);

  const { data, error, refresh } = usePolling(
    () => (selectedId ? getDashboard(selectedId) : Promise.resolve(null)),
    POLL_INTERVAL_MS,
    [selectedId],
  );

  if (error && !data) {
    return (
      <div className="state-card error-card">
        <Icon name="alert-triangle" size={24} color="var(--coral)" />
        <p className="error-title">Cannot load dashboard telemetry</p>
        <p className="muted small">{error.message}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="state-card loading-card">
        <div className="loading-spinner" />
        <p className="muted">Synchronizing spacecraft telemetry…</p>
      </div>
    );
  }

  const indicators = area
    ? data.indicators.filter((item) => item.body_area === area)
    : data.indicators;

  const onComplete = async (taskId) => {
    await completeTask(taskId);
    refresh();
  };

  const onAnalyze = async () => {
    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      setAnalysis(await analyzeCrewMember(selectedId));
      refresh();
    } catch (actionError) {
      setAnalyzeError(actionError);
    } finally {
      setAnalyzing(false);
    }
  };

  const userGreetingName = selected?.role || selected?.name || 'Commander';
  const attentionItems   = data.indicators.filter((i) => i.status !== 'green');
  const routineTasks     = (data.tasks || []).filter((t) => t.origin === 'routine');
  const isCheckInDone    = routineTasks.length > 0 ? routineTasks.every((t) => t.done) : true;
  const latestTime       = data.indicators.find((i) => i.timestamp)?.timestamp;

  const worst = worstStatus(data.indicators.map((i) => i.status)) || 'green';
  let overallLabel = 'Nominal', overallColor = 'var(--green)';
  if (worst === 'yellow') { overallLabel = 'Watch';    overallColor = 'var(--amber)'; }
  if (worst === 'red')    { overallLabel = 'Critical'; overallColor = 'var(--coral)'; }

  return (
    <div className="dashboard-page-container">

      {/* ── Early Warning Banner ── */}
      <WarningBanner warnings={data.warnings} />

      {/* ── Greeting row ── */}
      <section className="db-greeting-row" aria-label="Greeting">
        <div className="db-greeting-left">
          <h1 className="db-greeting-title">
            {attentionItems.length === 0
              ? `Good morning, ${userGreetingName}`
              : `Morning, ${userGreetingName}`}
          </h1>
          <p className="db-greeting-sub muted small">
            {attentionItems.length === 0
              ? 'All vitals within range — operational baseline nominal.'
              : (
                <>
                  <span className="db-warn-text" style={{ color: overallColor }}>
                    {attentionItems.length} indicator{attentionItems.length !== 1 ? 's' : ''} need{attentionItems.length === 1 ? 's' : ''} attention
                  </span>
                  {' — '}
                  {attentionItems.map((i) => i.name.toLowerCase()).join(', ')}.
                </>
              )}
          </p>
        </div>

        {/* Check-in status chip */}
        <Link
          to="/check-in"
          className={`db-checkin-chip ${isCheckInDone ? 'done' : 'pending'}`}
        >
          <Icon
            name={isCheckInDone ? 'check' : 'clipboard'}
            size={15}
            color={isCheckInDone ? 'var(--green)' : 'var(--amber)'}
          />
          <span>{isCheckInDone ? 'Check-in done' : 'Daily check-in pending'}</span>
          <Icon name="chevron-right" size={14} color="var(--muted)" />
        </Link>
      </section>

      {/* ── Vitals Tracker — collapsible panel (above main grid) ── */}
      <VitalsPanel indicators={indicators} updatedAt={latestTime} />

      {/* ── Main grid: Body Map hero + right column ── */}
      <div className="db-main-grid">

        {/* LEFT — 2D Body Map (hero) */}
        <div className="db-body-hero-col">
          <div className="db-body-hero-card">
            {/* Card header */}
            <div className="db-body-hero-header">
              <div className="db-body-hero-header-left">
                <Icon name="user" size={16} color="var(--muted)" />
                <span className="db-body-hero-title">Body Map</span>
              </div>
              <span className="db-body-hero-hint muted small">Tap area to filter vitals</span>
            </div>

            {/* Overall status dot */}
            <div className="db-overall-status-row">
              <span className="db-overall-dot" style={{ background: overallColor }} />
              <span className="db-overall-label" style={{ color: overallColor }}>{overallLabel}</span>
              <span className="muted small">overall</span>
            </div>

            <BodyMap
              areas={data.body_areas}
              selected={area}
              onSelect={setArea}
              heroMode={true}
              findings={findings}
              onDismissFinding={(id) => removeFinding(selectedId, id)}
              onClearAllFindings={() => clearFindings(selectedId)}
            />
          </div>
        </div>

        {/* RIGHT column — Mission Hazards + compact auxiliary cards */}
        <div className="db-right-col">

          {/* Mission Hazards — already accordion-style */}
          <HazardGroups indicators={data.indicators} />

          {/* Quick Actions (compact) */}
          <div className="db-quick-row">
            <Link to="/check-in"   className="db-quick-btn db-quick-primary">
              <Icon name="checkin"   size={16} color="#060A12" />
              <span>Check-in</span>
            </Link>
            <Link to="/assistant"  className="db-quick-btn db-quick-secondary">
              <Icon name="assistant" size={16} color="var(--muted)" />
              <span>Assistant</span>
            </Link>
            <Link to="/emergency"  className="db-quick-btn db-quick-emergency">
              <Icon name="emergency" size={16} color="var(--coral)" />
              <span>Emergency</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Bottom row: Tasks + Consistency + Anomaly (slim) ── */}
      <div className="db-bottom-grid">

        {/* Today's Tasks */}
        <TaskList tasks={data.tasks} onComplete={onComplete} />

        {/* Check-in Consistency */}
        <Card
          title="Consistency"
          icon={<Icon name="streak" size={16} color="var(--muted)" />}
          className="db-consistency-card"
        >
          <div className="db-streak-row">
            <span className="db-streak-num">{data.streak ?? 12}</span>
            <span className="muted small">days in a row</span>
          </div>
          <div className="db-streak-bar-track">
            <div
              className="db-streak-bar-fill"
              style={{ width: `${Math.min(100, ((data.streak || 12) / 14) * 100)}%` }}
            />
          </div>
          <div className="db-days-row">
            {DAYS_OF_WEEK.map((day, idx) => (
              <div key={day} className={`db-day-chip ${idx < 6 ? 'db-day-done' : 'db-day-today'}`}>
                <Icon name="check" size={10} />
                <span className="db-day-label">{day}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Anomaly Check */}
        <Card
          title="Anomaly Scan"
          aside="On demand"
          icon={<Icon name="activity" size={16} color="var(--muted)" />}
          className="db-anomaly-card"
        >
          <p className="muted small">
            ML scan for subtle telemetry drifts across all recent readings.
          </p>
          <button
            type="button"
            className="button ghost full-width-btn"
            onClick={onAnalyze}
            disabled={analyzing}
          >
            {analyzing ? 'Scanning…' : 'Run Anomaly Scan'}
          </button>
          {analyzeError && <p className="small mt-2" style={{ color: 'var(--coral)' }}>{analyzeError.message}</p>}
          {analysis && !analysis.model && (
            <p className="muted small mt-2">Analysis model currently offline.</p>
          )}
          {analysis && analysis.model && (
            <div className="anomaly-results-list mt-3">
              <span className="anomaly-model-tag muted small">Engine: {analysis.model}</span>
              {analysis.results.map((item) => (
                <div key={item.indicator} className="anomaly-item-row">
                  <span className="anomaly-indicator-name">{item.indicator}</span>
                  <span className={`anomaly-pill ${item.is_anomaly ? 'anomaly-flagged' : 'anomaly-clear'}`}>
                    {item.is_anomaly ? '⚠ Anomaly' : '✓ Nominal'} ({item.score.toFixed(1)})
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

    </div>
  );
}
