import { Link } from 'react-router-dom';
import Card from '@/components/common/Card.jsx';
import StatusBadge from '@/components/common/StatusBadge.jsx';
import { Icon } from '@/components/common/Icons.jsx';
import { worstStatus } from '@/constants/status.js';
import Sparkline from './Sparkline.jsx';

function formatUpdateTime(iso) {
  if (!iso) return 'Just now';
  try {
    const d = new Date(iso);
    return `Updated ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } catch {
    return 'Updated recently';
  }
}

export default function HealthStatusCard({ indicators = [] }) {
  const normalCount = indicators.filter((i) => i.status === 'green').length;
  const watchCount = indicators.filter((i) => i.status === 'yellow').length;
  const critCount = indicators.filter((i) => i.status === 'red').length;

  const worst = worstStatus(indicators.map((i) => i.status)) || 'green';

  let statusLabel = 'Stable';
  let ringColor = 'var(--green)';
  if (worst === 'yellow') {
    statusLabel = 'Watch';
    ringColor = 'var(--amber)';
  } else if (worst === 'red') {
    statusLabel = 'Act';
    ringColor = 'var(--coral)';
  }

  // Ring gauge parameters
  const size = 160;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // Calculate percentage healthy
  const total = indicators.length || 1;
  const healthyRatio = normalCount / total;
  const strokeDashoffset = circumference - healthyRatio * circumference;

  const latestTime = indicators.find((i) => i.timestamp)?.timestamp;

  return (
    <Card
      title="Health Status"
      icon={<Icon name="heart" size={18} color="var(--cyan)" />}
      aside={formatUpdateTime(latestTime)}
      className="health-status-card"
    >
      <div className="health-status-layout">
        {/* Left Column: Overall Status Ring Gauge & Stats */}
        <div className="health-ring-col">
          <div className="status-ring-container">
            <svg width={size} height={size} className="status-ring-svg">
              {/* Background Track */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="rgba(85, 198, 213, 0.12)"
                strokeWidth={strokeWidth}
              />
              {/* Active Ring Value */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={ringColor}
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                style={{ transition: 'stroke-dashoffset 0.8s ease' }}
              />
            </svg>
            <div className="status-ring-center">
              <span className="status-ring-value" style={{ color: ringColor }}>
                {statusLabel}
              </span>
              <span className="status-ring-sub">Overall status</span>
            </div>
          </div>

          {/* Breakdown bullets */}
          <div className="status-breakdown-list">
            <div className="breakdown-item">
              <span className="bullet-dot bullet-green" />
              <span>{normalCount} vitals normal</span>
            </div>
            <div className="breakdown-item">
              <span className="bullet-dot bullet-amber" />
              <span>{watchCount} need{watchCount === 1 ? 's' : ''} attention</span>
            </div>
            <div className="breakdown-item">
              <span className="bullet-dot bullet-coral" />
              <span>{critCount} critical</span>
            </div>
          </div>
        </div>

        {/* Right Column: Vitals List */}
        <div className="health-vitals-col">
          <div className="vitals-list">
            {indicators.map((vital) => (
              <Link
                key={vital.id}
                to={`/indicator/${vital.id}`}
                className="vital-row-item"
                title={`View ${vital.name} details: ${vital.reason || 'Normal'}`}
              >
                <div className="vital-left-info">
                  <span className="vital-icon-wrap">
                    <Icon name={vital.id} size={16} />
                  </span>
                  <span className="vital-name">{vital.name}</span>
                </div>

                <div className="vital-numeric">
                  <span className="vital-val">{vital.value ?? '—'}</span>
                  <span className="vital-unit muted small">{vital.unit}</span>
                </div>

                <div className="vital-badge-wrap">
                  <StatusBadge status={vital.status} />
                </div>

                <div className="vital-sparkline-wrap">
                  <Sparkline values={vital.trend} status={vital.status} width={90} height={24} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
