// The only place that knows how to reach the Core API.
const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(detail.detail ?? `Request failed (${response.status})`);
  }
  return response.json();
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  getBlob: async (path) => {
    const response = await fetch(`${BASE_URL}${path}`);
    if (!response.ok) throw new Error(`Request failed (${response.status})`);
    return response.blob();
  },
  postBlob: async (path, body) => {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const detail = await response.json().catch(() => ({}));
      throw new Error(detail.detail ?? `Request failed (${response.status})`);
    }
    return response.blob();
  },
};
