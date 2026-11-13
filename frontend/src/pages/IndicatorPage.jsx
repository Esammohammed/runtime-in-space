import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import Card from '@/components/common/Card.jsx';
import { Icon } from '@/components/common/Icons.jsx';
import { useCrew } from '@/context/CrewContext.jsx';
import { getIndicators, getSeries } from '@/services/readingsService.js';

const formatTime = (iso) =>
  new Date(iso).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

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

  if (error) {
    return (
      <div className="state-card error-card">
        <Icon name="alert-triangle" size={24} color="var(--coral)" />
        <p className="error-title">Cannot load indicator</p>
        <p className="muted small">{error.message}</p>
        <Link to="/" className="button ghost mt-3">← Back to Dashboard</Link>
      </div>
    );
  }

  if (!definition) {
    return (
      <div className="state-card loading-card">
        <div className="loading-spinner" />
        <p className="muted">Loading indicator telemetry…</p>
      </div>
    );
  }

  const [greenLow, greenHigh] = definition.green;

  return (
    <div className="indicator-detail-page">
      {/* Back Link */}
      <div className="detail-top-nav">
        <Link to="/" className="back-link">
          <Icon name="arrow-left" size={16} />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      {/* Page Header */}
      <header className="indicator-page-header">
        <div className="indicator-title-zone">
          <span className="indicator-hero-icon">
            <Icon name={definition.id} size={28} color="var(--cyan)" />
          </span>
          <div>
            <h1 className="indicator-main-title">{definition.name}</h1>
            <div className="indicator-tags-row">
              <span className="indicator-pill-tag">
                Unit: <strong>{definition.unit}</strong>
              </span>
              <span className="indicator-pill-tag">
                Source: <strong>{definition.source === 'continuous' ? 'Live Sensor' : 'Manual Entry'}</strong>
              </span>
              {definition.nasa_risk && (
                <span className="indicator-pill-tag muted">
                  Risk: {definition.nasa_risk}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Over time Chart */}
      <Card
        title="Telemetry Trend"
        icon={<Icon name="activity" size={18} color="var(--cyan)" />}
        aside={`${series.length} readings · Shaded area is nominal range`}
        className="chart-card"
      >
        <div className="chart" style={{ height: 340, width: '100%', minWidth: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 12, right: 24, bottom: 8, left: 8 }}>
              <CartesianGrid stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
              <ReferenceArea
                y1={greenLow}
                y2={greenHigh}
                fill="var(--green)"
                fillOpacity={0.12}
                stroke="var(--green)"
                strokeOpacity={0.25}
              />
              <XAxis
                dataKey="timestamp"
                tickFormatter={formatTime}
                minTickGap={60}
                stroke="var(--muted)"
                fontSize={12}
                tickLine={false}
              />
              <YAxis
                domain={['auto', 'auto']}
                stroke="var(--muted)"
                fontSize={12}
                unit={` ${definition.unit}`}
                width={80}
                tickLine={false}
              />
              <Tooltip
                labelFormatter={formatTime}
                contentStyle={{
                  background: 'var(--space)',
                  border: '1px solid rgba(85, 198, 213, 0.2)',
                  borderRadius: '12px',
                  color: 'var(--text)',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="var(--cyan)"
                dot={false}
                strokeWidth={2.5}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Clinical Guidance Grid */}
      <div className="guide-grid">
        <Card
          title="How to measure it"
          icon={<Icon name="guide" size={18} color="var(--cyan)" />}
        >
          <p className="guide-text">{definition.how_to_measure}</p>
        </Card>

        <Card
          title="Why it matters in space"
          icon={<Icon name="shield" size={18} color="var(--cyan)" />}
        >
          <p className="guide-text">{definition.why_it_matters}</p>
        </Card>

        <Card
          title="Clinical Protocols"
          icon={<Icon name="alert-triangle" size={18} color="var(--amber)" />}
        >
          <div className="protocol-action-item">
            <span className="action-level-tag level-watch">Watch Threshold</span>
            <p className="action-level-text">{definition.actions?.yellow || 'Continue routine monitoring.'}</p>
          </div>
          <div className="protocol-action-item mt-3">
            <span className="action-level-tag level-act">Action Protocol</span>
            <p className="action-level-text">{definition.actions?.red || 'Notify flight surgeon and follow countermeasure protocol.'}</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
