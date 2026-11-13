/** A tiny trend line. Decorative: the value and status carry the meaning. */
export default function Sparkline({ values = [], className = '' }) {
  if (values.length < 2) return <svg className="sparkline" aria-hidden="true" viewBox="0 0 200 36" />;
  const min = Math.min(...values);
  const span = Math.max(...values) - min || 1;
  const points = values
    .map((value, index) => `${(index / (values.length - 1)) * 200},${32 - ((value - min) / span) * 28}`)
    .join(' ');
  return (
    <svg className={`sparkline ${className}`} aria-hidden="true" viewBox="0 0 200 36" preserveAspectRatio="none">
      <polyline points={points} fill="none" strokeWidth="2" />
    </svg>
  );
}
