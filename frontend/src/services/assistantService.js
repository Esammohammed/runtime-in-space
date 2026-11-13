import { api, USE_MOCK } from './apiClient.js';

/** history is the prior turns of this conversation, oldest first: [{role, content}]. */
export const ask = (crewId, question, history = []) =>
  USE_MOCK
    ? Promise.resolve({
        answer: `[mock] The assistant answers here once the backend is running.${history.length ? ` (turn ${history.length / 2 + 1})` : ''}`,
        sources: [], model: 'mock',
      })
    : api.post('/assistant/ask', { crew_id: crewId, question, history });

export const analyzeImage = (crewId, imageBase64, mimeType, note) =>
  USE_MOCK
    ? Promise.resolve({ description: '[mock] Photo analysis appears here.', next_step: 'Connect the backend.', urgency: 'watch', model: 'mock', skin_model: null })
    : api.post('/assistant/analyze-image', { crew_id: crewId, image_base64: imageBase64, mime_type: mimeType, note });

export const listSampleImages = () =>
  USE_MOCK ? Promise.resolve([]) : api.get('/assistant/sample-images');

export const fetchSampleImage = (name) => api.getBlob(`/assistant/sample-images/${encodeURIComponent(name)}`);
