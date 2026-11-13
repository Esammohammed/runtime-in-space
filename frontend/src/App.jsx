import { CrewProvider, useCrew } from '@/context/CrewContext.jsx';
import IdentityPage from '@/pages/IdentityPage.jsx';
import AppRoutes from '@/routes/AppRoutes.jsx';

function Gate() {
  const { identityConfirmed, loading } = useCrew();
  const isEmergencyRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/emergency');

  if (isEmergencyRoute || (!loading && identityConfirmed)) {
    return <AppRoutes />;
  }

  return (
    <div className="page">
      <IdentityPage />
    </div>
  );
}

export default function App() {
  return (
    <CrewProvider>
      <Gate />
    </CrewProvider>
  );
}
