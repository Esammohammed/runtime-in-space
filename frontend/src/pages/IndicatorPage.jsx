import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CartesianGrid, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import Card from '@/components/common/Card.jsx';
import { useCrew } from '@/context/CrewContext.jsx';
import { getIndicators, getSeries } from '@/services/readingsService.js';

const formatTime = (iso) => new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function IndicatorPage() {
  const { indicatorId } = useParams();
  const { selectedId } = useCrew();
  const [definition, setDefinition] = useState(null);
  const [series, setSeries] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!selectedId) return;
    setError(null);
    Promise.all([getIndicators(), getSeries(selectedId, indicatorId)])
      .then(([definitions, points]) => {
        setDefinition(definitions.find((item) => item.id === indicatorId) ?? null);
        setSeries(points);
      })
      .catch(setError);
  }, [selectedId, indicatorId]);

  if (error) return <p className="error">{error.message}</p>;
  if (!definition) return <p className="muted">Loading…</p>;

  const [greenLow, greenHigh] = definition.green;
  return (
    <>
      <p><Link to="/">← Back to home</Link></p>
      <h1>{definition.name}</h1>
      <Card title="Over time" aside={`${series.length} readings · shaded band is the normal range`}>
        <div className="chart">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--line)" vertical={false} />
              <ReferenceArea y1={greenLow} y2={greenHigh} fill="var(--green)" fillOpacity={0.12} />
              <XAxis dataKey="timestamp" tickFormatter={formatTime} minTickGap={60} stroke="var(--muted)" fontSize={12} />
              <YAxis domain={['auto', 'auto']} stroke="var(--muted)" fontSize={12} unit={` ${definition.unit}`} width={80} />
              <Tooltip labelFormatter={formatTime} contentStyle={{ background: 'var(--panel)', border: '1px solid var(--line)' }} />
              <Line type="monotone" dataKey="value" stroke="var(--accent)" dot={false} strokeWidth={2} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <div className="guide-grid">
        <Card title="How to measure it"><p>{definition.how_to_measure}</p></Card>
        <Card title="Why it matters in space"><p>{definition.why_it_matters}</p></Card>
        <Card title="What to do">
          <p><strong>Watch:</strong> {definition.actions?.yellow}</p>
          <p><strong>Act:</strong> {definition.actions?.red}</p>
        </Card>
      </div>
    </>
  );
}
