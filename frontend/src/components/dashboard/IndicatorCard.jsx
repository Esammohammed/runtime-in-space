import { Link } from 'react-router-dom';
import StatusBadge from '@/components/common/StatusBadge.jsx';
import { Icon } from '@/components/common/Icons.jsx';
import { statusOf } from '@/constants/status.js';
import Sparkline from './Sparkline.jsx';

export default function IndicatorCard({ indicator }) {
  const { id, name, unit, source, value, status, reason, trend, nasa_risk: nasaRisk } = indicator;
  const { className } = statusOf(status);

  return (
    <Link to={`/indicator/${id}`} className={`astro-indicator-card ${className}`}>
      <div className="indicator-top-row">
        <div className="indicator-header-group">
          <span className="indicator-type-icon">
            <Icon name={id} size={16} />
          </span>
          <span className="indicator-name">{name}</span>
        </div>
        <span className="indicator-source-pill">
          {source === 'continuous' ? 'Live' : 'Manual'}
        </span>
      </div>

      {nasaRisk && <p className="indicator-risk-text">{nasaRisk}</p>}

      <div className="indicator-numeric-row">
        <span className="indicator-value-number">{value ?? '—'}</span>
        <span className="indicator-unit-label">{unit}</span>
      </div>

      <div className="indicator-sparkline-wrap">
        <Sparkline values={trend} status={status} width={180} height={32} />
      </div>

      <div className="indicator-footer-row">
        <StatusBadge status={status} />
        {reason && <span className="indicator-reason-text">{reason}</span>}
      </div>
    </Link>
  );
}
