import { CrewProvider, useCrew } from '@/context/CrewContext.jsx';
import IdentityPage from '@/pages/IdentityPage.jsx';
import AppRoutes from '@/routes/AppRoutes.jsx';

function Gate() {
  const { identityConfirmed, loading } = useCrew();
  if (!loading && identityConfirmed) return <AppRoutes />;
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
