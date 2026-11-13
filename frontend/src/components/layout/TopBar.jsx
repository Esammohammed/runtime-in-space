import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@/components/common/Icons.jsx';
import { useCrew } from '@/context/CrewContext.jsx';

function getInitials(member) {
  if (!member) return 'AH';
  if (member.role?.toLowerCase().includes('commander')) return 'CM';
  const parts = (member.name || '').trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  if (parts[0]) return parts[0].slice(0, 2).toUpperCase();
  return 'CR';
}

export default function TopBar({ onToggleSidebar, streak = 12 }) {
  const { selected, switchIdentity, error } = useCrew();
  const [menuOpen, setMenuOpen] = useState(false);

  const initials = getInitials(selected);

  return (
    <header className="astro-topbar" aria-label="Main Navigation Header">
      {/* Left side: Hamburger toggle on mobile + Brand / Mission indicator */}
      <div className="topbar-left-zone">
        <button
          type="button"
          className="mobile-menu-trigger"
          onClick={onToggleSidebar}
          aria-label="Open navigation menu"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <div className="topbar-mission-chip">
          <Icon name="mission" size={15} color="var(--cyan)" />
          <span className="mission-text">
            Mission: Mars Transit <span className="chip-divider">·</span> Day 124
          </span>
        </div>

        {error && (
          <div className="topbar-error-chip" role="alert">
            <Icon name="alert-triangle" size={14} color="var(--coral)" />
            <span>API Offline</span>
          </div>
        )}
      </div>

      {/* Right side: Telemetry chips + User profile + PROMINENT MAIN EMERGENCY CTA */}
      <div className="topbar-right-zone">
        {/* Streak Chip */}
        {streak !== null && streak !== undefined && (
          <div className="status-chip streak-chip" title="Completed check-in streak">
            <Icon name="flame" size={15} color="var(--amber)" />
            <span className="chip-text font-semibold">{streak}-day streak</span>
          </div>
        )}

        {/* User Profile Avatar with Switcher */}
        <div className="user-profile-zone">
          <button
            type="button"
            className="avatar-btn"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={`User profile for ${selected?.name || 'Astronaut'}. Click to switch crew member.`}
            title={`${selected?.name || 'Astronaut'} (${selected?.role || 'Crew'}) - Click to switch`}
          >
            <span className="avatar-initials">{initials}</span>
          </button>

          {menuOpen && (
            <div className="profile-dropdown-card">
              <div className="dropdown-member-info">
                <strong className="text-white">{selected?.name || 'Astronaut'}</strong>
                <span className="muted small">{selected?.role || 'Mission Specialist'}</span>
              </div>
              <button
                type="button"
                className="button ghost dropdown-switch-btn"
                onClick={() => {
                  setMenuOpen(false);
                  switchIdentity();
                }}
              >
                Switch Crew Member
              </button>
            </div>
          )}
        </div>

        {/* PROMINENT MAIN EMERGENCY CTA - ALWAYS VISIBLE, NEVER HIDDEN */}
        <Link
          to="/emergency"
          className="topbar-main-emergency-cta"
          title="Direct Emergency Medical Protocols"
        >
          <span className="emergency-cta-pulse-dot" />
          <Icon name="emergency" size={18} color="#FFFFFF" />
          <span className="emergency-cta-label">EMERGENCY</span>
        </Link>
      </div>
    </header>
  );
}
