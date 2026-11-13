import { Route, Routes } from 'react-router-dom';
import MainLayout from '@/layouts/MainLayout.jsx';
import AssistantPage from '@/pages/AssistantPage.jsx';
import CheckInPage from '@/pages/CheckInPage.jsx';
import CrewPage from '@/pages/CrewPage.jsx';
import EmergencyPage from '@/pages/EmergencyPage.jsx';
import HomePage from '@/pages/HomePage.jsx';
import IndicatorPage from '@/pages/IndicatorPage.jsx';

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/indicator/:indicatorId" element={<IndicatorPage />} />
        <Route path="/check-in" element={<CheckInPage />} />
        <Route path="/assistant" element={<AssistantPage />} />
        <Route path="/crew" element={<CrewPage />} />
        <Route path="/emergency" element={<EmergencyPage />} />
      </Route>
    </Routes>
  );
}
