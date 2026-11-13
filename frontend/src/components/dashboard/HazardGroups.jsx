import { useState } from 'react';
import Card from '@/components/common/Card.jsx';
import StatusBadge from '@/components/common/StatusBadge.jsx';
import { Icon } from '@/components/common/Icons.jsx';
import { HAZARDS } from '@/constants/hazards.js';
import { worstStatus } from '@/constants/status.js';
import IndicatorCard from './IndicatorCard.jsx';

const HAZARD_ICONS = {
  radiation: 'radiation',
  isolation: 'crew',
  gravity: 'activity',
  environment: 'wind',
};

// Subtle risk gauge width based on worst status
const STATUS_BAR_WIDTHS = {
  green: '28%',
  yellow: '68%',
  red: '92%',
};

export default function HazardGroups({ indicators }) {
  const [open, setOpen] = useState(() => new Set());

  const groups = Object.keys(HAZARDS).map((hazard) => {
    const items = indicators.filter((item) => item.hazard === hazard);
    return { hazard, items, worst: worstStatus(items.map((item) => item.status)) };
  }).filter((group) => group.items.length > 0);

  const toggle = (hazard) => {
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(hazard)) next.delete(hazard);
      else next.add(hazard);
      return next;
    });
  };

  return (
    <Card
      title="Mission Hazards"
      icon={<Icon name="shield" size={18} color="var(--cyan)" />}
      aside="View details >"
      className="mission-hazards-card"
    >
      <div className="hazards-list">
        {groups.map(({ hazard, items, worst }) => {
          const expanded = open.has(hazard);
          const iconName = HAZARD_ICONS[hazard] || 'shield';
          const barWidth = STATUS_BAR_WIDTHS[worst] || '20%';

          // Build a live summary from the indicators in this hazard
          const summaryText = items
            .slice(0, 2)
            .map((i) => `${i.name}: ${i.value ?? '—'} ${i.unit}`)
            .join(' · ');

          return (
            <div key={hazard} className={`hazard-item-block ${expanded ? 'expanded' : ''}`}>
              <button
                type="button"
                className="hazard-summary-row"
                aria-expanded={expanded}
                onClick={() => toggle(hazard)}
              >
                <div className="hazard-row-left">
                  <span className={`hazard-icon-bubble status-${worst}`}>
                    <Icon name={iconName} size={18} />
                  </span>
                  <div className="hazard-info">
                    <div className="hazard-title-row">
                      <span className="hazard-title">{HAZARDS[hazard]}</span>
                    </div>
                    <span className="hazard-metrics-preview muted small">
                      {summaryText}
                    </span>
                    <div className="hazard-progress-track">
                      <div
                        className={`hazard-progress-bar status-bg-${worst}`}
                        style={{ width: barWidth }}
                      />
                    </div>
                  </div>
                </div>

                <div className="hazard-row-right">
                  <StatusBadge status={worst} />
                  <span className={`hazard-expand-chevron ${expanded ? 'open' : ''}`}>
                    <Icon name="chevron-down" size={16} />
                  </span>
                </div>
              </button>

              {expanded && (
                <div className="hazard-expanded-body">
                  <div className="indicator-grid">
                    {items.map((indicator) => (
                      <IndicatorCard key={indicator.id} indicator={indicator} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="hazards-footnote muted small">
        Hazard levels follow the mission's existing thresholds.
      </p>
    </Card>
  );
}
