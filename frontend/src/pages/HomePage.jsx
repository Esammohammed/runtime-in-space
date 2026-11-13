import { useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '@/components/common/Card.jsx';
import BodyMap from '@/components/dashboard/BodyMap.jsx';
import HazardGroups from '@/components/dashboard/HazardGroups.jsx';
import HealthStatusCard from '@/components/dashboard/HealthStatusCard.jsx';
import TaskList from '@/components/dashboard/TaskList.jsx';
import WarningBanner from '@/components/dashboard/WarningBanner.jsx';
import { Icon } from '@/components/common/Icons.jsx';
import { POLL_INTERVAL_MS } from '@/constants/status.js';
import { useCrew } from '@/context/CrewContext.jsx';
import usePolling from '@/hooks/usePolling.js';
import { analyzeCrewMember, completeTask, getDashboard } from '@/services/crewService.js';

const DAYS_OF_WEEK = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

export default function HomePage() {
  const { selected, selectedId } = useCrew();
  const [area, setArea] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState(null);

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
        <p className="muted">Synchronizing spacecraft telemetry & crew health data…</p>
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

  // Greeting & Status Summary
  const userGreetingName = selected?.role || selected?.name || 'Commander';
  const attentionItems = data.indicators.filter((i) => i.status !== 'green');
  const routineTasks = (data.tasks || []).filter((t) => t.origin === 'routine');
  const isCheckInCompleted = routineTasks.length > 0 ? routineTasks.every((t) => t.done) : true;

  return (
    <div className="dashboard-page-container">
      {/* Early Warning Banner */}
      <WarningBanner warnings={data.warnings} />

      {/* Greeting & Quick Status Row */}
      <section className="greeting-row" aria-label="Greeting and check-in status">
        <div className="greeting-text-zone">
          <h1 className="greeting-title">Good morning, {userGreetingName}</h1>
          <p className="greeting-subtitle">
            {attentionItems.length === 0 ? (
              <span className="text-green">All vitals are within range. Operational baseline nominal.</span>
            ) : (
              <>
                <span>All key vitals nominal. </span>
                <span className="text-amber font-semibold">
                  {attentionItems.length} item{attentionItems.length === 1 ? '' : 's'} need{attentionItems.length === 1 ? 's' : ''} attention:
                </span>{' '}
                <span className="attention-indicators-names text-amber">
                  {attentionItems.map((i) => i.name.toLowerCase()).join(', ')}.
                </span>
              </>
            )}
          </p>
        </div>

        {/* Check-in status badge card on right */}
        <Link
          to="/check-in"
          className={`checkin-status-card ${isCheckInCompleted ? 'completed' : 'pending'}`}
          title="Go to daily check-in"
        >
          <div className="checkin-status-icon">
            <Icon
              name={isCheckInCompleted ? 'check' : 'clipboard'}
              size={18}
              color={isCheckInCompleted ? 'var(--green)' : 'var(--amber)'}
            />
          </div>
          <div className="checkin-status-info">
            <span className="checkin-status-heading">
              {isCheckInCompleted ? 'Daily check-in completed' : 'Daily check-in pending'}
            </span>
            <span className="checkin-status-timestamp muted small">
              {isCheckInCompleted ? 'Nov 13, 2026 · 08:42' : 'Tap to record today’s readings'}
            </span>
          </div>
          <Icon name="chevron-right" size={16} color="var(--muted)" />
        </Link>
      </section>

      {/* Row 1: Health Status & Mission Hazards (Hero Row) */}
      <div className="dashboard-main-grid">
        <div className="grid-col-health">
          <HealthStatusCard indicators={indicators} />
        </div>
        <div className="grid-col-hazards">
          <HazardGroups indicators={data.indicators} />
        </div>
      </div>

      {/* Row 2: Consistency, Quick Actions, and Today's Diagnostic Tasks (3-column balanced rhythm) */}
      <div className="dashboard-trio-grid">
        {/* Check-in Consistency Card */}
        <Card
          title="Check-in Consistency"
          icon={<Icon name="streak" size={18} color="var(--cyan)" />}
          className="consistency-card"
        >
          <div className="consistency-streak-number">
            <span className="streak-digit">{data.streak ?? 12}</span>
            <span className="streak-label">days in a row</span>
          </div>
          <p className="consistency-note muted small">
            Honest daily reports give your flight surgeon the clearest trend. Report symptoms even if it ends the streak.
          </p>
          <div className="consistency-progress-track">
            <div
              className="consistency-progress-bar"
              style={{ width: `${Math.min(100, ((data.streak || 12) / 14) * 100)}%` }}
            />
          </div>
          <div className="consistency-days-row">
            {DAYS_OF_WEEK.map((day, idx) => (
              <div key={day} className={`day-chip ${idx < 6 ? 'day-checked' : 'day-active'}`}>
                <span className="day-check-icon">
                  <Icon name="check" size={12} />
                </span>
                <span className="day-name">{day}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Quick Actions Card */}
        <Card
          title="Quick Actions"
          icon={<Icon name="quick" size={18} color="var(--cyan)" />}
          className="quick-actions-card"
        >
          <div className="quick-actions-stack">
            {/* Primary Action Button */}
            <Link to="/check-in" className="quick-action-btn primary-gradient-btn">
              <div className="action-btn-left">
                <span className="action-btn-icon">
                  <Icon name="checkin" size={18} color="#070C15" />
                </span>
                <div className="action-btn-text">
                  <strong className="action-title">Daily check-in</strong>
                  <span className="action-sub">Update today's readings</span>
                </div>
              </div>
              <Icon name="chevron-right" size={16} color="#070C15" />
            </Link>

            {/* Assistant Secondary Action */}
            <Link to="/assistant" className="quick-action-btn secondary-space-btn">
              <div className="action-btn-left">
                <span className="action-btn-icon">
                  <Icon name="assistant" size={18} color="var(--cyan)" />
                </span>
                <div className="action-btn-text">
                  <strong className="action-title">Ask the assistant</strong>
                  <span className="action-sub muted small">NASA medical guidance</span>
                </div>
              </div>
              <Icon name="chevron-right" size={16} color="var(--muted)" />
            </Link>

            {/* Emergency Action Button */}
            <Link to="/emergency" className="quick-action-btn emergency-coral-btn">
              <div className="action-btn-left">
                <span className="action-btn-icon">
                  <Icon name="emergency" size={18} color="var(--coral)" />
                </span>
                <div className="action-btn-text">
                  <strong className="action-title">Emergency mode</strong>
                  <span className="action-sub muted small">Step-by-step offline protocols</span>
                </div>
              </div>
              <Icon name="chevron-right" size={16} color="var(--coral)" />
            </Link>
          </div>
        </Card>

        {/* Tasks Card */}
        <div className="tasks-container">
          <TaskList tasks={data.tasks} onComplete={onComplete} />
        </div>
      </div>

      {/* Row 3: Anatomical Body Map & On-Demand Anomaly Detection */}
      <div className="dashboard-diagnostics-grid">
        {/* Interactive Body Map Card */}
        <div className="bodymap-container">
          <BodyMap areas={data.body_areas} selected={area} onSelect={setArea} />
        </div>

        {/* Anomaly Check Card */}
        <div className="anomaly-container">
          <Card
            title="Anomaly Check"
            aside="On demand"
            icon={<Icon name="activity" size={18} color="var(--cyan)" />}
            className="anomaly-card"
          >
            <p className="muted small">
              Scans for subtle drifts and multi-indicator patterns across recent telemetry using machine learning anomaly models.
            </p>
            <button
              type="button"
              className="button ghost full-width-btn"
              onClick={onAnalyze}
              disabled={analyzing}
            >
              {analyzing ? 'Scanning telemetry streams…' : 'Run Anomaly Analysis'}
            </button>
            {analyzeError && <p className="error small mt-2">{analyzeError.message}</p>}
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
                      {item.is_anomaly ? '⚠ Anomaly Detected' : '✓ Nominal'} (score {item.score.toFixed(1)})
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
