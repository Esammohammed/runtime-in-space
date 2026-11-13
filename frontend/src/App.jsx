import { CrewProvider } from '@/context/CrewContext.jsx';
import AppRoutes from '@/routes/AppRoutes.jsx';

export default function App() {
  return (
    <CrewProvider>
      <AppRoutes />
    </CrewProvider>
  );
}
