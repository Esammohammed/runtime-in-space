import { useCrew } from '@/context/CrewContext.jsx';

// Shows who this browser is signed in as, with an explicit way to change it.
// There is no quick-switch tab bar any more -- seeing or editing another
// crew member's data takes a deliberate "Switch crew member" action.
export default function CrewSwitcher() {
  const { selected, switchIdentity, error } = useCrew();
  if (error) return <div className="bar error">Cannot reach the Core API: {error.message}</div>;
  if (!selected) return null;
  return (
    <div className="bar identity-bar" role="group" aria-label="Crew member">
      <span className="chip active">{selected.name} <span className="muted small">{selected.role}</span></span>
      <button type="button" className="chip" onClick={switchIdentity}>Switch crew member</button>
    </div>
  );
}
