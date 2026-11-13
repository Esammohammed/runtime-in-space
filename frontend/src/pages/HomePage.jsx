import { useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '@/components/common/Card.jsx';
import BodyMap from '@/components/dashboard/BodyMap.jsx';
import HazardGroups from '@/components/dashboard/HazardGroups.jsx';
import TaskList from '@/components/dashboard/TaskList.jsx';
import WarningBanner from '@/components/dashboard/WarningBanner.jsx';
import { POLL_INTERVAL_MS } from '@/constants/status.js';
import { useCrew } from '@/context/CrewContext.jsx';
import usePolling from '@/hooks/usePolling.js';
import { analyzeCrewMember, completeTask, getDashboard } from '@/services/crewService.js';

export default function HomePage() {
  const { selectedId } = useCrew();
  const [area, setArea] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState(null);
  const { data, error, refresh } = usePolling(
    () => (selectedId ? getDashboard(selectedId) : Promise.resolve(null)),
    POLL_INTERVAL_MS,
    [selectedId],
  );

  if (error && !data) return <p className="error">Cannot load the dashboard: {error.message}</p>;
  if (!data) return <p className="muted">Loading…</p>;

  const indicators = area ? data.indicators.filter((item) => item.body_area === area) : data.indicators;
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

  return (
    <>
      <WarningBanner warnings={data.warnings} />
      <div className="home-grid">
        <HazardGroups indicators={indicators} />
        <aside className="side">
          <BodyMap areas={data.body_areas} selected={area} onSelect={setArea} />
          <TaskList tasks={data.tasks} onComplete={onComplete} />
          <Card title={`${data.streak}-day streak`}>
            <p className="muted">Consecutive days with a completed check-in.</p>
            <Link to="/check-in" className="button">Do today's check-in</Link>
          </Card>
          <Card title="Ask the assistant" aside="On board">
            <p className="muted">Chat about a symptom, or analyze a photo separately. Answers cite their sources.</p>
            <div className="row wrap">
              <Link to="/assistant" className="button ghost">Open chat</Link>
              <Link to="/photo-check" className="button ghost">Analyze a photo</Link>
            </div>
          </Card>
          <Card title="Anomaly check" aside="On demand">
            <p className="muted">Looks for unusual patterns across recent readings.</p>
            <button type="button" className="button ghost" onClick={onAnalyze} disabled={analyzing}>
              {analyzing ? 'Checking…' : 'Run analysis'}
            </button>
            {analyzeError && <p className="error">{analyzeError.message}</p>}
            {analysis && !analysis.model && (
              <p className="muted small">Model unavailable right now.</p>
            )}
            {analysis && analysis.model && (
              <ul className="small">
                {analysis.results.map((item) => (
                  <li key={item.indicator}>
                    {item.indicator}: {item.is_anomaly ? 'unusual' : 'normal'} (score {item.score.toFixed(1)})
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </aside>
      </div>
    </>
  );
}
