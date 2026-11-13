import Card from '@/components/common/Card.jsx';
import StatusBadge from '@/components/common/StatusBadge.jsx';
import { BODY_AREAS, statusOf } from '@/constants/status.js';

// Where each area's marker sits on the 240 x 470 figure.
const MARKERS = { head: [120, 50], heart: [137, 149], lungs: [100, 140], metabolism: [120, 216], body: [120, 360] };

function Marker({ area, status }) {
  const [x, y] = MARKERS[area];
  const { className } = statusOf(status);
  // Shape changes with status so it does not rely on colour.
  if (status === 'red') return <polygon className={`marker ${className}`} points={`${x},${y - 15} ${x + 14},${y + 11} ${x - 14},${y + 11}`} />;
  if (status === 'yellow') return <rect className={`marker ${className}`} x={x - 11} y={y - 11} width="22" height="22" transform={`rotate(45 ${x} ${y})`} />;
  return <circle className={`marker ${className}`} cx={x} cy={y} r="11" />;
}

export default function BodyMap({ areas = {}, selected, onSelect }) {
  const names = Object.keys(BODY_AREAS);
  const summary = names.map((area) => `${BODY_AREAS[area]} ${statusOf(areas[area]).label}`).join(', ');
  return (
    <Card title="Body map" aside="Pick an area">
      <svg className="body-map" role="img" aria-label={`Body outline. ${summary}`} viewBox="0 0 240 470">
        <g className="body-shape">
          <circle cx="120" cy="50" r="34" />
          <rect x="108" y="82" width="24" height="22" />
          <rect x="70" y="100" width="100" height="156" rx="28" />
          <rect x="36" y="106" width="26" height="150" rx="13" />
          <rect x="178" y="106" width="26" height="150" rx="13" />
          <rect x="76" y="262" width="38" height="196" rx="19" />
          <rect x="126" y="262" width="38" height="196" rx="19" />
        </g>
        {names.map((area) => <Marker key={area} area={area} status={areas[area]} />)}
      </svg>
      <div className="area-grid">
        {names.map((area) => (
          <button key={area} type="button" aria-pressed={selected === area}
            className={selected === area ? 'area active' : 'area'} onClick={() => onSelect(selected === area ? null : area)}>
            {BODY_AREAS[area]}
            <StatusBadge status={areas[area]} />
          </button>
        ))}
      </div>
    </Card>
  );
}
