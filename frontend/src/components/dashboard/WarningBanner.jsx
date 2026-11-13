import { Link } from 'react-router-dom';

export default function WarningBanner({ warnings = [] }) {
  if (warnings.length === 0) return null;
  const [latest] = warnings;
  return (
    <section className="warning-banner" aria-label="Early warning">
      <div>
        <strong>Early warning</strong>
        <p>{latest.message}</p>
        {warnings.length > 1 && <p className="small">{warnings.length - 1} more in the last 24 hours</p>}
      </div>
      {latest.indicator && (
        <Link to={`/indicator/${latest.indicator}`} className="button ghost">See why and what to do</Link>
      )}
    </section>
  );
}
