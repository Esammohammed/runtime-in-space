import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import CrewSwitcher from '@/components/layout/CrewSwitcher.jsx';
import Sidebar from '@/components/layout/Sidebar.jsx';
import SpaceBackground from '@/components/layout/SpaceBackground.jsx';
import TopBar from '@/components/layout/TopBar.jsx';

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-shell">
      <SpaceBackground />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content-column">
        <TopBar onToggleSidebar={() => setSidebarOpen(true)} />
        <CrewSwitcher />
        <main className="content-viewport">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
