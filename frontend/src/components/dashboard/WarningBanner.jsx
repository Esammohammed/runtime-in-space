import { Link } from 'react-router-dom';
import { Icon } from '@/components/common/Icons.jsx';

export default function WarningBanner({ warnings = [] }) {
  if (!warnings || warnings.length === 0) return null;
  const [latest] = warnings;

  return (
    <section className="astro-warning-banner" aria-label="Early warning">
      <div className="warning-banner-left">
        <span className="warning-banner-icon">
          <Icon name="alert-triangle" size={20} color="var(--amber)" />
        </span>
        <div className="warning-banner-text">
          <div className="warning-badge-row">
            <span className="warning-type-tag">Early Warning</span>
            {warnings.length > 1 && (
              <span className="warning-counter-tag muted small">
                +{warnings.length - 1} more in last 24h
              </span>
            )}
          </div>
          <p className="warning-message-text">{latest.message}</p>
        </div>
      </div>

      {latest.indicator && (
        <Link to={`/indicator/${latest.indicator}`} className="warning-action-btn">
          <span>See why & what to do</span>
          <Icon name="chevron-right" size={16} />
        </Link>
      )}
    </section>
  );
}
