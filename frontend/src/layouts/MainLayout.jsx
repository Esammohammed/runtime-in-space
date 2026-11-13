import { Outlet } from 'react-router-dom';
import CrewSwitcher from '@/components/layout/CrewSwitcher.jsx';
import TopBar from '@/components/layout/TopBar.jsx';

export default function MainLayout() {
  return (
    <div className="app">
      <TopBar />
      <CrewSwitcher />
      <main className="page">
        <Outlet />
      </main>
    </div>
  );
}
