/**
 * Refined medical sparkline matching the AstroHealth reference.
 * Generates a smooth, clean trend line based on readings.
 */
export default function Sparkline({ values = [], status = 'green', width = 120, height = 28, className = '' }) {
  if (!values || values.length < 2) {
    return (
      <svg className={`astro-sparkline ${className}`} width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
        <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="rgba(159, 179, 200, 0.2)" strokeDasharray="3 3" />
      </svg>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const padding = 4;
  const usableHeight = height - padding * 2;

  const points = values.map((val, idx) => {
    const x = (idx / (values.length - 1)) * width;
    const y = height - padding - ((val - min) / span) * usableHeight;
    return [x, y];
  });

  // Build smooth bezier path
  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpX = (prev[0] + curr[0]) / 2;
    d += ` C ${cpX} ${prev[1]}, ${cpX} ${curr[1]}, ${curr[0]} ${curr[1]}`;
  }

  // Determine stroke color by status
  let strokeColor = 'var(--cyan)';
  if (status === 'yellow' || status === 'status-yellow') strokeColor = 'var(--amber)';
  else if (status === 'red' || status === 'status-red') strokeColor = 'var(--coral)';
  else if (status === 'green' || status === 'status-green') strokeColor = 'var(--cyan)';

  return (
    <svg
      className={`astro-sparkline ${className}`}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
    >
      <path
        d={d}
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
