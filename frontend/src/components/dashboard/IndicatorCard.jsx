import { Link } from 'react-router-dom';
import StatusBadge from '@/components/common/StatusBadge.jsx';
import { statusOf } from '@/constants/status.js';
import Sparkline from './Sparkline.jsx';

export default function IndicatorCard({ indicator }) {
  const { id, name, unit, source, value, status, reason, trend } = indicator;
  const { className } = statusOf(status);
  return (
    <Link to={`/indicator/${id}`} className={`indicator-card ${className}`}>
      <div className="row muted small">
        <span>{name}</span>
        <span>{source === 'band' ? 'Live · band' : 'Manual'}</span>
      </div>
      <div className="indicator-value">
        {value ?? '—'} <span className="muted unit">{unit}</span>
      </div>
      <Sparkline values={trend} className={className} />
      <div className="row small">
        <StatusBadge status={status} />
        <span className="muted reason">{reason}</span>
      </div>
    </Link>
  );
}
