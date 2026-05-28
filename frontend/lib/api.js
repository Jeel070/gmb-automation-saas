const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// grab token from localStorage, skip on server side
function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('gmb_token');
}

// base fetch wrapper — attaches auth header and throws on errors
async function http(path, opts = {}) {
  const token = getToken();

  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// auth — register, login, invite a client
export const authAPI = {
  register: (body) => http('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => http('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  invite: (body) => http('/api/auth/invite', { method: 'POST', body: JSON.stringify(body) }),
};

// tenant — profile, stats, client list
export const tenantAPI = {
  profile: () => http('/api/tenant/profile'),
  clients: () => http('/api/tenant/clients'),
  stats: () => http('/api/tenant/stats'),
};

// posts — full CRUD + publish + AI generate
export const postsAPI = {
  list: (status) => http(`/api/posts${status ? `?status=${status}` : ''}`),
  get: (id) => http(`/api/posts/${id}`),
  create: (body) => http('/api/posts', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => http(`/api/posts/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (id) => http(`/api/posts/${id}`, { method: 'DELETE' }),
  publishNow: (id) => http(`/api/posts/${id}/publish-now`, { method: 'POST' }),
  logs: (id) => http(`/api/posts/${id}/logs`),
  generate: (body) => http('/api/posts/generate', { method: 'POST', body: JSON.stringify(body) }),
};
