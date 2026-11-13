import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { addCrewMember, listCrew } from '@/services/crewService.js';

const CrewContext = createContext(null);
const IDENTITY_KEY = 'runtime-in-space.identity-id';

export function CrewProvider({ children }) {
  const [crew, setCrew] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [identityConfirmed, setIdentityConfirmed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    listCrew()
      .then((members) => {
        setCrew(members);
        const storedId = Number(localStorage.getItem(IDENTITY_KEY));
        if (storedId && members.some((m) => m.id === storedId)) {
          setSelectedId(storedId);
          setIdentityConfirmed(true);
        }
      })
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  // A name picked once and remembered in this browser -- not a login. Anyone
  // with API access can still reach another crew member's data directly;
  // this only keeps the app's own screens scoped to one person at a time.
  const confirmIdentity = (id) => {
    localStorage.setItem(IDENTITY_KEY, String(id));
    setSelectedId(id);
    setIdentityConfirmed(true);
  };

  const switchIdentity = () => {
    localStorage.removeItem(IDENTITY_KEY);
    setIdentityConfirmed(false);
  };

  const createCrewMember = async (name, role) => {
    const member = await addCrewMember(name, role);
    setCrew((current) => [...current, member]);
    return member;
  };

  const value = useMemo(
    () => ({
      crew, selectedId, identityConfirmed, loading, error,
      selected: crew.find((m) => m.id === selectedId) ?? null,
      confirmIdentity, switchIdentity, createCrewMember,
    }),
    [crew, selectedId, identityConfirmed, loading, error],
  );
  return <CrewContext.Provider value={value}>{children}</CrewContext.Provider>;
}

export function useCrew() {
  const context = useContext(CrewContext);
  if (!context) throw new Error('useCrew must be used inside CrewProvider');
  return context;
}
