import { api, USE_MOCK } from './apiClient.js';

export const ask = (crewId, question) =>
  USE_MOCK
    ? Promise.resolve({ answer: '[mock] The assistant answers here once the backend is running.', sources: [], model: 'mock' })
    : api.post('/assistant/ask', { crew_id: crewId, question });

export const analyzeImage = (crewId, imageBase64, mimeType, note) =>
  USE_MOCK
    ? Promise.resolve({ description: '[mock] Photo analysis appears here.', next_step: 'Connect the backend.', model: 'mock' })
    : api.post('/assistant/analyze-image', { crew_id: crewId, image_base64: imageBase64, mime_type: mimeType, note });
