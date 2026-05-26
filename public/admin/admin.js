const TOKEN_KEY = 'impar_cms_token';

export function getToken() {
  return sessionStorage.getItem(TOKEN_KEY) || '';
}
export function setToken(t) {
  sessionStorage.setItem(TOKEN_KEY, t);
}
export function clearToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

export async function login(password) {
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.error || 'Senha incorreta');
  setToken(password);
}

export function logout() {
  clearToken();
  window.location.reload();
}

export async function api(path, opts = {}) {
  const token = getToken();
  const res = await fetch(path, {
    ...opts,
    headers: {
      'content-type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  });
  if (res.status === 401 || res.status === 403) {
    clearToken();
    window.location.reload();
    throw new Error('unauthorized');
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(data.error || `${res.status} ${res.statusText}`);
  return data;
}

export async function uploadFile(file) {
  const token = getToken();
  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: {
      'content-type': file.type,
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: file,
  });
  if (!res.ok) throw new Error('upload failed');
  return res.json();
}

export function toast(message, kind = 'ok') {
  let el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.toggle('error', kind === 'error');
  el.classList.add('visible');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('visible'), 2400);
}

export function formatWhen(ms) {
  if (!ms) return '—';
  const d = new Date(ms);
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function loadMe() {
  return api('/api/me').then(d => d.email).catch(() => null);
}
