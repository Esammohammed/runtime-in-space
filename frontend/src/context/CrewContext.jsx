import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { listCrew } from '@/services/crewService.js';

const CrewContext = createContext(null);

export function CrewProvider({ children }) {
  const [crew, setCrew] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    listCrew()
      .then((members) => {
        setCrew(members);
        setSelectedId((current) => current ?? members[0]?.id ?? null);
      })
      .catch(setError);
  }, []);

  const value = useMemo(
    () => ({ crew, selectedId, setSelectedId, selected: crew.find((m) => m.id === selectedId) ?? null, error }),
    [crew, selectedId, error],
  );
  return <CrewContext.Provider value={value}>{children}</CrewContext.Provider>;
}

export function useCrew() {
  const context = useContext(CrewContext);
  if (!context) throw new Error('useCrew must be used inside CrewProvider');
  return context;
}
