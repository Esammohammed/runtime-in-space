import { useState } from 'react';
import Card from '@/components/common/Card.jsx';
import { useCrew } from '@/context/CrewContext.jsx';

export default function IdentityPage() {
  const { crew, loading, error, confirmIdentity, createCrewMember } = useCrew();
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState(null);

  const onAdd = async (event) => {
    event.preventDefault();
    if (!name.trim()) return setFormError(new Error('Enter a name.'));
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
    <div className="identity-page">
      <h1>Runtime in Space <span className="muted">Crew Health</span></h1>
      <p className="muted">
        Pick your name to see your own dashboard, check-in and chat history.
        This is not a password login -- it only keeps this browser's screens
        scoped to one person at a time.
      </p>

      {loading && <p className="muted">Loading crew…</p>}
      {error && <p className="error">Cannot reach the Core API: {error.message}</p>}

      {!loading && !error && (
        <Card title="Who are you?">
          {crew.length === 0 && <p className="muted">No crew members yet. Add the first one below.</p>}
          <div className="protocol-list">
            {crew.map((member) => (
              <button key={member.id} type="button" className="button big ghost" onClick={() => confirmIdentity(member.id)}>
                {member.name} <span className="muted small">{member.role}</span>
              </button>
            ))}
          </div>
        </Card>
      )}

      {!loading && !error && (
        <Card title="Add a new crew member" aside="Name only, no credentials">
          <form onSubmit={onAdd} className="form">
            <div className="field">
              <label htmlFor="name">Name</label>
              <input id="name" value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="role">Role <span className="muted">(optional)</span></label>
              <input id="role" value={role} onChange={(event) => setRole(event.target.value)} />
            </div>
            {formError && <p className="error">{formError.message}</p>}
            <button type="submit" className="button" disabled={busy}>
              {busy ? 'Adding…' : 'Add and continue'}
            </button>
          </form>
        </Card>
      )}
    </div>
  );
}
