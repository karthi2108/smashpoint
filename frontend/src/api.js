let token = null;
export const setToken = (t) => { token = t; };

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(path, { ...options, headers });
  if (!res.ok) {
    let detail = res.statusText;
    try { detail = (await res.json()).detail || detail; } catch { /* not json */ }
    throw new Error(detail);
  }
  return res.status === 204 ? null : res.json();
}

export const api = {
  login: (username, password) => request('/api/auth/login', { method: 'POST', body: { username, password } }),
  categories: () => request('/api/categories'),
  entries: (cat) => request(`/api/entries?category=${cat}`),
  addEntries: (category, names) => request('/api/entries', { method: 'POST', body: { category, names } }),
  importFile: (category, file) => {
    const fd = new FormData();
    fd.append('category', category);
    fd.append('file', file);
    return request('/api/entries/import', { method: 'POST', body: fd });
  },
  deleteEntry: (id) => request(`/api/entries/${id}`, { method: 'DELETE' }),
  clearCategory: (cat) => request(`/api/entries?category=${cat}`, { method: 'DELETE' }),
  bracket: (cat) => request(`/api/fixtures/${cat}`),
  generateBracket: (cat) => request(`/api/fixtures/${cat}/generate`, { method: 'POST' }),
  deleteBracket: (cat) => request(`/api/fixtures/${cat}`, { method: 'DELETE' }),
  renameSide: (id, side, name) => request(`/api/fixtures/match/${id}`, { method: 'PATCH', body: { side, name } }),
  walkover: (id, winner) => request(`/api/fixtures/match/${id}/walkover`, { method: 'POST', body: { winner } }),
  matches: () => request('/api/matches'),
  match: (id) => request(`/api/matches/${id}`),
  createMatch: (body) => request('/api/matches', { method: 'POST', body }),
  point: (id, side) => request(`/api/matches/${id}/point`, { method: 'POST', body: { side } }),
  undo: (id) => request(`/api/matches/${id}/undo`, { method: 'POST' }),
  abandon: (id) => request(`/api/matches/${id}`, { method: 'DELETE' }),
};

export function matchSocket(id, onMessage) {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const ws = new WebSocket(`${proto}://${window.location.host}/ws/matches/${id}`);
  ws.onmessage = (e) => onMessage(JSON.parse(e.data));
  return ws;
}
