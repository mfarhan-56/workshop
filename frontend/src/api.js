const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'https://workshop-jncm.onrender.com').replace(/\/$/, '');

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
    });
  } catch {
    throw new Error('Could not reach the CampusPulse API. Check your connection and try again.');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

export const api = {
  base: API_BASE,
  events: () => request('/api/events'),
  event: (id) => request(`/api/events/${encodeURIComponent(id)}`),
  users: () => request('/api/users'),
  registrations: (userId) => request(`/api/me/registrations?user_id=${encodeURIComponent(userId)}`),
  register: (userId, eventId) => request('/api/registrations', {
    method: 'POST', body: JSON.stringify({ user_id: userId, event_id: eventId }),
  }),
  attendees: (eventId, organizerId) => request(`/api/events/${encodeURIComponent(eventId)}/registrations?organizer_id=${encodeURIComponent(organizerId)}`),
};
