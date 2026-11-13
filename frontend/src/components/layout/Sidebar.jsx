import { NavLink } from 'react-router-dom';
import { AstroLogo, Icon } from '@/components/common/Icons.jsx';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: 'dashboard', end: true },
  { to: '/check-in', label: 'Check-in', icon: 'checkin' },
  { to: '/assistant', label: 'Assistant', icon: 'assistant' },
  { to: '/photo-check', label: 'Photo check', icon: 'photo' },
  { to: '/crew', label: 'Crew', icon: 'crew' },
  { to: '/emergency', label: 'Emergency', icon: 'emergency', isEmergency: true },
];

export default function Sidebar({ isOpen, onClose }) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="sidebar-overlay"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={`astro-sidebar ${isOpen ? 'open' : ''}`} aria-label="Main Navigation">
        {/* Brand header */}
        <div className="sidebar-brand">
          <AstroLogo size={32} />
          <div className="brand-text">
            <span className="brand-title">AstroHealth</span>
            <span className="brand-subtitle">Health Monitor</span>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="sidebar-nav">
          {NAV_ITEMS.map(({ to, label, icon, end, isEmergency }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''} ${isEmergency ? 'emergency-item' : ''}`
              }
            >
              <span className="sidebar-link-icon">
                <Icon name={icon} size={19} />
              </span>
              <span className="sidebar-link-label">{label}</span>
              {isEmergency && <span className="coral-dot" aria-hidden="true" />}
            </NavLink>
          ))}
        </nav>

        {/* Sidebar Footer with Earth limb arc & tagline */}
        <div className="sidebar-footer">
          <div className="sidebar-earth-arc" aria-hidden="true" />
          <div className="sidebar-tagline">
            <span className="tagline-eyebrow">LONG-DURATION CARE</span>
            <p className="tagline-text">Stay healthy.<br />Explore further.</p>
          </div>
        </div>
      </aside>
    </>
  );
}
