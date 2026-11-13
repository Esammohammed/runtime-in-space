import { api, USE_MOCK } from './apiClient.js';

export const listEvents = (crewId) => (USE_MOCK ? Promise.resolve([]) : api.get(`/crew/${crewId}/events`));

/** Emergency steps are logged so they reach the report for Earth. Never blocks the UI. */
export const logEvent = (crewId, message, data = {}) =>
  USE_MOCK
    ? Promise.resolve(null)
    : api.post('/events', { crew_id: crewId, type: 'emergency', message, data }).catch(() => null);
