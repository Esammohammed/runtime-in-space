import { useState } from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from '@/components/common/StatusBadge.jsx';
import { Icon } from '@/components/common/Icons.jsx';
import Sparkline from './Sparkline.jsx';
import { worstStatus } from '@/constants/status.js';

/**
 * VitalsPanel — collapsed by default, showing only the summary pill.
 * On click it expands to show every indicator row.
 */
export default function VitalsPanel({ indicators = [], updatedAt }) {
  const [open, setOpen] = useState(false);

  const normalCount = indicators.filter((i) => i.status === 'green').length;
  const watchCount  = indicators.filter((i) => i.status === 'yellow').length;
  const critCount   = indicators.filter((i) => i.status === 'red').length;
  const worst       = worstStatus(indicators.map((i) => i.status)) || 'green';

  let statusLabel = 'All Nominal';
  if (worst === 'yellow') statusLabel = `${watchCount} need attention`;
  if (worst === 'red')    statusLabel = `${critCount} critical`;

  const statusColorClass = worst === 'red' ? 'coral' : worst === 'yellow' ? 'amber' : 'green';

  const formattedTime = updatedAt
    ? (() => {
        try {
          return new Date(updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch { return ''; }
      })()
    : '';

  return (
    <div className={`vitals-panel ${open ? 'vitals-panel--open' : ''}`}>
      {/* ── Collapsed header / toggle ── */}
      <button
        type="button"
        className="vitals-panel-header"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <div className="vitals-panel-header-left">
          <Icon name="heart" size={16} color="var(--muted)" />
          <span className="vitals-panel-title">Vitals Tracker</span>
          <span className={`vitals-panel-summary-pill vp-${statusColorClass}`}>
            {statusLabel}
          </span>
        </div>

        <div className="vitals-panel-header-right">
          {/* Quick dot summary */}
          <div className="vitals-dot-row" aria-hidden="true">
            {indicators.map((i) => (
              <span
                key={i.id}
                className={`vitals-dot vitals-dot--${i.status === 'red' ? 'red' : i.status === 'yellow' ? 'amber' : 'green'}`}
                title={i.name}
              />
            ))}
          </div>
          {formattedTime && (
            <span className="vitals-panel-timestamp muted small">{formattedTime}</span>
          )}
          <span className={`vitals-panel-chevron ${open ? 'open' : ''}`}>
            <Icon name="chevron-down" size={16} />
          </span>
        </div>
      </button>

      {/* ── Expanded vitals list ── */}
      {open && (
        <div className="vitals-panel-body">
          <div className="vitals-panel-counts">
            <span className="vp-count-pill vp-green-pill">{normalCount} normal</span>
            {watchCount > 0 && <span className="vp-count-pill vp-amber-pill">{watchCount} watch</span>}
            {critCount  > 0 && <span className="vp-count-pill vp-red-pill">{critCount} critical</span>}
          </div>

          <div className="vitals-panel-list">
            {indicators.map((vital) => (
              <Link
                key={vital.id}
                to={`/indicator/${vital.id}`}
                className={`vp-vital-row vp-vital-row--${vital.status}`}
                title={`View ${vital.name} details`}
              >
                <div className="vp-vital-left">
                  <span className="vp-vital-icon">
                    <Icon name={vital.id} size={15} />
                  </span>
                  <span className="vp-vital-name">{vital.name}</span>
                </div>

                <div className="vp-vital-mid">
                  <Sparkline values={vital.trend} status={vital.status} width={80} height={22} />
                </div>

                <div className="vp-vital-right">
                  <span className="vp-vital-value">{vital.value ?? '—'}</span>
                  <span className="vp-vital-unit muted small">{vital.unit}</span>
                  <StatusBadge status={vital.status} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
