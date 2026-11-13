import { useCrew } from '@/context/CrewContext.jsx';

export default function CrewSwitcher() {
  const { crew, selectedId, setSelectedId, error } = useCrew();
  if (error) return <div className="bar error">Cannot reach the Core API: {error.message}</div>;
  return (
    <div className="bar" role="group" aria-label="Crew member">
      {crew.map((member) => (
        <button key={member.id} type="button" aria-pressed={member.id === selectedId}
          className={member.id === selectedId ? 'chip active' : 'chip'} onClick={() => setSelectedId(member.id)}>
          {member.name} <span className="muted small">{member.role}</span>
        </button>
      ))}
    </div>
  );
}
