import { api, USE_MOCK } from './apiClient.js';
import { mockAnalyze, mockCrew, mockDashboard } from './mockData.js';

export const listCrew = () => (USE_MOCK ? Promise.resolve(mockCrew) : api.get('/crew'));

export const addCrewMember = (name, role = '') =>
  USE_MOCK
    ? Promise.resolve((() => {
        const member = { id: Date.now(), name, role, age: null, baselines: {} };
        mockCrew.push(member);
        return member;
      })())
    : api.post('/crew', { name, role });

export const getDashboard = (crewId) =>
  USE_MOCK ? Promise.resolve(mockDashboard(crewId)) : api.get(`/crew/${crewId}/dashboard`);

export const analyzeCrewMember = (crewId) =>
  USE_MOCK ? Promise.resolve(mockAnalyze()) : api.post(`/crew/${crewId}/analyze`);

export const completeTask = (taskId) =>
  USE_MOCK ? Promise.resolve({ id: taskId, done: true }) : api.post(`/tasks/${taskId}/done`);

export const listReports = (crewId) => (USE_MOCK ? Promise.resolve([]) : api.get(`/crew/${crewId}/reports`));

export const createReport = (crewId) =>
  USE_MOCK
    ? Promise.resolve({ id: Date.now(), crew_id: crewId, state: 'queued', created_at: new Date().toISOString(),
        text: '[mock] Report text appears here once the assistant service is connected.' })
    : api.post(`/crew/${crewId}/reports`);
