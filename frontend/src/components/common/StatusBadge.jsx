import { statusOf } from '@/constants/status.js';

export default function StatusBadge({ status }) {
  const { label, symbol, className } = statusOf(status);
  return (
    <span className={`status ${className}`}>
      <span aria-hidden="true">{symbol}</span> {label}
    </span>
  );
}
