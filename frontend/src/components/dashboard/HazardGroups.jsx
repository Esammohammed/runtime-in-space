import { useState } from 'react';
import StatusBadge from '@/components/common/StatusBadge.jsx';
import { HAZARDS } from '@/constants/hazards.js';
import { worstStatus } from '@/constants/status.js';
import IndicatorCard from './IndicatorCard.jsx';

// Replaces a flat wall of indicator cards with one collapsed tile per
// hazard, each showing its worst status at a glance. Click a tile to see
// its indicator cards.
export default function HazardGroups({ indicators }) {
  const [open, setOpen] = useState(() => new Set());

  const groups = Object.keys(HAZARDS).map((hazard) => {
    const items = indicators.filter((item) => item.hazard === hazard);
    return { hazard, items, worst: worstStatus(items.map((item) => item.status)) };
  }).filter((group) => group.items.length > 0);

  const toggle = (hazard) => {
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(hazard)) next.delete(hazard); else next.add(hazard);
      return next;
    });
  };

  return (
    <section className="hazard-groups" aria-label="Health indicators by hazard">
      {groups.map(({ hazard, items, worst }) => {
        const expanded = open.has(hazard);
        return (
          <div key={hazard} className="hazard-group">
            <button type="button" className="hazard-group-header" aria-expanded={expanded} onClick={() => toggle(hazard)}>
              <span className="hazard-group-title">
                <span aria-hidden="true" className={expanded ? 'chevron open' : 'chevron'}>▸</span>
                {HAZARDS[hazard]}
                <span className="muted small">{items.length} indicator{items.length === 1 ? '' : 's'}</span>
              </span>
              <StatusBadge status={worst} />
            </button>
            {expanded && (
              <div className="indicator-grid hazard-group-body">
                {items.map((indicator) => <IndicatorCard key={indicator.id} indicator={indicator} />)}
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}
