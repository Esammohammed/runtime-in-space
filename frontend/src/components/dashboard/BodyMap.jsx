import Card from '@/components/common/Card.jsx';
import StatusBadge from '@/components/common/StatusBadge.jsx';
import { Icon } from '@/components/common/Icons.jsx';
import { BODY_AREAS, statusOf } from '@/constants/status.js';

// Coordinates on the 240 x 470 figure
const MARKERS = {
  head: [120, 50],
  heart: [137, 149],
  lungs: [100, 140],
  metabolism: [120, 216],
  body: [120, 360],
};

function Marker({ area, status }) {
  const [x, y] = MARKERS[area];
  const { className } = statusOf(status);

  let fillColor = 'rgba(88, 201, 155, 0.2)';
  let strokeColor = 'var(--green)';
  if (status === 'yellow') {
    fillColor = 'rgba(240, 182, 92, 0.2)';
    strokeColor = 'var(--amber)';
  } else if (status === 'red') {
    fillColor = 'rgba(230, 109, 120, 0.2)';
    strokeColor = 'var(--coral)';
  }

  if (status === 'red') {
    return (
      <polygon
        className={`body-marker ${className}`}
        points={`${x},${y - 14} ${x + 13},${y + 10} ${x - 13},${y + 10}`}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth="2.5"
      />
    );
  }

  if (status === 'yellow') {
    return (
      <rect
        className={`body-marker ${className}`}
        x={x - 10}
        y={y - 10}
        width="20"
        height="20"
        transform={`rotate(45 ${x} ${y})`}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth="2.5"
      />
    );
  }

  return (
    <circle
      className={`body-marker ${className}`}
      cx={x}
      cy={y}
      r="10"
      fill={fillColor}
      stroke={strokeColor}
      strokeWidth="2.5"
    />
  );
}

export default function BodyMap({ areas = {}, selected, onSelect }) {
  const names = Object.keys(BODY_AREAS);
  const summary = names.map((area) => `${BODY_AREAS[area]} ${statusOf(areas[area]).label}`).join(', ');

  return (
    <Card
      title="Body Map"
      icon={<Icon name="user" size={18} color="var(--cyan)" />}
      aside="Pick an area to filter"
      className="body-map-card"
    >
      <div className="body-map-layout">
        <div className="body-svg-container">
          <svg className="body-map-svg" role="img" aria-label={`Body outline. ${summary}`} viewBox="0 0 240 470">
            {/* Subtle glow / grid behind body */}
            <defs>
              <linearGradient id="bodyOutlineGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1E3250" />
                <stop offset="100%" stopColor="#152338" />
              </linearGradient>
            </defs>

            <g className="body-silhouette">
              <circle cx="120" cy="50" r="34" fill="url(#bodyOutlineGrad)" stroke="rgba(85, 198, 213, 0.3)" strokeWidth="1.5" />
              <rect x="108" y="82" width="24" height="22" fill="url(#bodyOutlineGrad)" stroke="rgba(85, 198, 213, 0.3)" strokeWidth="1.5" />
              <rect x="70" y="100" width="100" height="156" rx="28" fill="url(#bodyOutlineGrad)" stroke="rgba(85, 198, 213, 0.3)" strokeWidth="1.5" />
              <rect x="36" y="106" width="26" height="150" rx="13" fill="url(#bodyOutlineGrad)" stroke="rgba(85, 198, 213, 0.3)" strokeWidth="1.5" />
              <rect x="178" y="106" width="26" height="150" rx="13" fill="url(#bodyOutlineGrad)" stroke="rgba(85, 198, 213, 0.3)" strokeWidth="1.5" />
              <rect x="76" y="262" width="38" height="196" rx="19" fill="url(#bodyOutlineGrad)" stroke="rgba(85, 198, 213, 0.3)" strokeWidth="1.5" />
              <rect x="126" y="262" width="38" height="196" rx="19" fill="url(#bodyOutlineGrad)" stroke="rgba(85, 198, 213, 0.3)" strokeWidth="1.5" />
            </g>

            {names.map((area) => (
              <Marker key={area} area={area} status={areas[area]} />
            ))}
          </svg>
        </div>

        <div className="body-areas-list">
          {names.map((area) => (
            <button
              key={area}
              type="button"
              aria-pressed={selected === area}
              className={`body-area-pill ${selected === area ? 'active' : ''}`}
              onClick={() => onSelect(selected === area ? null : area)}
            >
              <span className="area-label-name">{BODY_AREAS[area]}</span>
              <StatusBadge status={areas[area]} />
            </button>
          ))}
          {selected && (
            <button
              type="button"
              className="clear-area-filter-btn muted small"
              onClick={() => onSelect(null)}
            >
              Show all areas
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}
