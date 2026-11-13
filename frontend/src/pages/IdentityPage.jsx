import { useState } from 'react';
import Card from '@/components/common/Card.jsx';
import { AstroLogo, Icon } from '@/components/common/Icons.jsx';
import SpaceBackground from '@/components/layout/SpaceBackground.jsx';
import { useCrew } from '@/context/CrewContext.jsx';

function getInitials(name, role) {
  if (role?.toLowerCase().includes('commander')) return 'CM';
  const parts = (name || '').trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  if (parts[0]) return parts[0].slice(0, 2).toUpperCase();
  return 'CR';
}

export default function IdentityPage() {
  const { crew, loading, error, confirmIdentity, createCrewMember } = useCrew();
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState(null);

  const onAdd = async (event) => {
    event.preventDefault();
    if (!name.trim()) return setFormError(new Error('Please enter a crew member name.'));
    setBusy(true);
    setFormError(null);
    try {
      const member = await createCrewMember(name.trim(), role.trim());
      confirmIdentity(member.id);
    } catch (addError) {
      setFormError(addError);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="identity-gate-wrapper">
      <SpaceBackground />
      <div className="identity-page-modal">
        {/* Brand Header */}
        <div className="identity-brand-center">
          <AstroLogo size={48} />
          <h1 className="identity-main-title">AstroHealth</h1>
          <p className="identity-tagline muted">Autonomous Spaceflight Medical & Clinical Monitor</p>
          <a href="/emergency" className="emergency-gate-pill">
            <Icon name="emergency" size={15} color="var(--coral)" />
            <span>Emergency Protocols Override</span>
          </a>
        </div>

        {loading && (
          <div className="state-card loading-card">
            <div className="loading-spinner" />
            <p className="muted">Verifying spacecraft telemetry & crew roster…</p>
          </div>
        )}

        {error && (
          <div className="state-card error-card">
            <Icon name="alert-triangle" size={24} color="var(--coral)" />
            <p className="error-title">Cannot reach flight Core API</p>
            <p className="muted small">{error.message}</p>
          </div>
        )}

        {!loading && !error && (
          <>
            <Card
              title="Identify Crew Member"
              icon={<Icon name="crew" size={18} color="var(--cyan)" />}
              aside="Mission Roster"
              className="identity-roster-card"
            >
              <p className="muted small mb-3">
                Select your profile to load individual baselines, active telemetry, and clinical logs.
              </p>

              {crew.length === 0 && (
                <p className="muted">No crew members registered yet. Add the first astronaut below.</p>
              )}

              <div className="crew-selection-grid">
                {crew.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    className="crew-member-tile"
                    onClick={() => confirmIdentity(member.id)}
                  >
                    <div className="tile-avatar-circle">
                      <span>{getInitials(member.name, member.role)}</span>
                    </div>
                    <div className="tile-text-info">
                      <strong className="tile-name">{member.name}</strong>
                      <span className="tile-role muted small">{member.role || 'Astronaut'}</span>
                    </div>
                    <Icon name="chevron-right" size={16} color="var(--cyan)" />
                  </button>
                ))}
              </div>
            </Card>

            <Card
              title="Register New Astronaut"
              icon={<Icon name="user" size={18} color="var(--cyan)" />}
              aside="Roster update"
              className="identity-add-card"
            >
              <form onSubmit={onAdd} className="astro-form">
                <div className="astro-field-group">
                  <label htmlFor="name" className="astro-field-label">Full Name</label>
                  <input
                    id="name"
                    placeholder="e.g. Elena Rostova"
                    className="astro-text-input"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </div>

                <div className="astro-field-group">
                  <label htmlFor="role" className="astro-field-label">
                    Mission Role <span className="muted small">(optional)</span>
                  </label>
                  <input
                    id="role"
                    placeholder="e.g. Flight Engineer, Commander"
                    className="astro-text-input"
                    value={role}
                    onChange={(event) => setRole(event.target.value)}
                  />
                </div>

                {formError && (
                  <div className="form-error-banner" role="alert">
                    <Icon name="alert-triangle" size={16} color="var(--coral)" />
                    <span>{formError.message}</span>
                  </div>
                )}

                <div className="form-actions-row">
                  <button
                    type="submit"
                    className="button primary-gradient-btn"
                    disabled={busy}
                  >
                    <span>{busy ? 'Registering…' : 'Register & Enter Medical Terminal'}</span>
                  </button>
                </div>
              </form>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
