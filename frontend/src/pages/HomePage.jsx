import { useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '@/components/common/Card.jsx';
import BodyMap from '@/components/dashboard/BodyMap.jsx';
import IndicatorCard from '@/components/dashboard/IndicatorCard.jsx';
import TaskList from '@/components/dashboard/TaskList.jsx';
import WarningBanner from '@/components/dashboard/WarningBanner.jsx';
import { POLL_INTERVAL_MS } from '@/constants/status.js';
import { useCrew } from '@/context/CrewContext.jsx';
import usePolling from '@/hooks/usePolling.js';
import { completeTask, getDashboard } from '@/services/crewService.js';

export default function HomePage() {
  const { selectedId } = useCrew();
  const [area, setArea] = useState(null);
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

  return (
    <>
      <WarningBanner warnings={data.warnings} />
      <div className="home-grid">
        <section className="indicator-grid" aria-label="Health indicators">
          {indicators.map((indicator) => <IndicatorCard key={indicator.id} indicator={indicator} />)}
        </section>
        <BodyMap areas={data.body_areas} selected={area} onSelect={setArea} />
        <aside className="side">
          <TaskList tasks={data.tasks} onComplete={onComplete} />
          <Card title={`${data.streak}-day streak`}>
            <p className="muted">Consecutive days with a completed check-in.</p>
            <Link to="/check-in" className="button">Do today's check-in</Link>
          </Card>
          <Card title="Ask the assistant" aside="On board">
            <p className="muted">Describe a symptom or send a photo. Answers cite their sources.</p>
            <Link to="/assistant" className="button ghost">Open the assistant</Link>
          </Card>
        </aside>
      </div>
    </>
  );
}
