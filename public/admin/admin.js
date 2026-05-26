// Shared helpers used by both /admin/ and /admin/editor.html.
// Cloudflare Access cookies/JWT are sent automatically by the browser, so
// fetch() against same-origin /api/* "just works" once the user has logged in.

export async function api(path, opts = {}) {
  const res = await fetch(path, {
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json', ...(opts.headers || {}) },
    ...opts,
  });
  if (res.status === 401 || res.status === 403) {
    // Force a reload through Access to re-authenticate.
    window.location.reload();
    throw new Error('unauthorized');
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(data.error || `${res.status} ${res.statusText}`);
  return data;
}

export async function uploadFile(file) {
  const res = await fetch('/api/upload', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': file.type },
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
