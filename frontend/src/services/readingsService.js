import { api, USE_MOCK } from './apiClient.js';
import { mockIndicators, mockSeries } from './mockData.js';

export const getIndicators = () => (USE_MOCK ? Promise.resolve(mockIndicators) : api.get('/content/indicators'));

export const getSeries = (crewId, indicatorId, limit = 500) =>
  USE_MOCK
    ? Promise.resolve(mockSeries(indicatorId))
    : api.get(`/crew/${crewId}/readings?indicator=${encodeURIComponent(indicatorId)}&limit=${limit}`);

/** Daily check-in: values is { indicatorId: number }. */
export const submitCheckIn = (crewId, values) =>
  USE_MOCK
    ? Promise.resolve({ stored: Object.keys(values).length,
        assessments: Object.entries(values).map(([indicator, value]) => ({ indicator, value, status: 'green', reason: 'Within the normal range' })) })
    : api.post('/readings', { crew_id: crewId, source: 'manual', timestamp: new Date().toISOString(), values });
