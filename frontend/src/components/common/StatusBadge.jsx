import { statusOf } from '@/constants/status.js';

export default function StatusBadge({ status, label: customLabel, className = '' }) {
  const { label, symbol, className: statusClass } = statusOf(status);
  const displayLabel = customLabel || label;

  // In the reference, normal has a small checkmark or dot
  let displaySymbol = symbol;
  if (status === 'green') displaySymbol = '✓';
  else if (status === 'yellow') displaySymbol = '⊙';
  else if (status === 'red') displaySymbol = '▲';

  return (
    <span className={`status-pill ${statusClass} ${className}`}>
      <span className="status-symbol" aria-hidden="true">{displaySymbol}</span>
      <span className="status-label">{displayLabel}</span>
    </span>
  );
}
