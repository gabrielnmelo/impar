import { requireAdmin, AuthError } from './auth.js';
import {
  listPosts, getPost, createPost, updatePost, setStatus, deletePost,
} from './posts.js';
import { uploadImage, serveImage } from './images.js';

const json = (data, init = {}) =>
  new Response(JSON.stringify(data), {
    ...init,
    headers: { 'content-type': 'application/json; charset=utf-8', ...(init.headers || {}) },
  });

async function readJson(request) {
  try { return await request.json(); } catch { return {}; }
}

async function handleApi(request, env, url) {
  const { pathname } = url;
  const method = request.method;

  // Public: list published posts.
  if (pathname === '/api/posts' && method === 'GET') {
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '12', 10) || 12, 50);
    const statusParam = url.searchParams.get('status');
    if (statusParam && statusParam !== 'published') {
      await requireAdmin(request, env);
    }
    const posts = await listPosts(env, { status: statusParam || 'published', limit });
    return json({ posts });
  }

  // Public: password login.
  if (pathname === '/api/login' && method === 'POST') {
    const body = await readJson(request);
    const enc = new TextEncoder();
    const pass = enc.encode(body.password || '');
    const secret = enc.encode(env.CMS_PASSWORD || '');
    let ok = pass.length > 0 && pass.length === secret.length;
    if (ok) {
      let diff = 0;
      for (let i = 0; i < pass.length; i++) diff |= pass[i] ^ secret[i];
      ok = diff === 0;
    }
    if (!ok) return json({ error: 'Senha incorreta' }, { status: 401 });
    return json({ ok: true });
  }

  // Everything below requires admin auth.
  const user = await requireAdmin(request, env);

  if (pathname === '/api/me' && method === 'GET') {
    return json({ email: user.email });
  }

  if (pathname === '/api/upload' && method === 'POST') {
    return uploadImage(request, env);
  }

  const m = pathname.match(/^\/api\/posts(?:\/([A-Za-z0-9_-]+))?(?:\/(publish|unpublish))?$/);
  if (m) {
    const id = m[1];
    const action = m[2];

    if (!id && method === 'POST') {
      const body = await readJson(request);
      const post = await createPost(env, body, user.email);
      return json({ post }, { status: 201 });
    }
    if (id && !action && method === 'GET') {
      const post = await getPost(env, id);
      return post ? json({ post }) : json({ error: 'not found' }, { status: 404 });
    }
    if (id && !action && (method === 'PATCH' || method === 'PUT')) {
      const body = await readJson(request);
      const post = await updatePost(env, id, body);
      return post ? json({ post }) : json({ error: 'not found' }, { status: 404 });
    }
    if (id && !action && method === 'DELETE') {
      const post = await deletePost(env, id);
      return post ? json({ ok: true }) : json({ error: 'not found' }, { status: 404 });
    }
    if (id && action === 'publish' && method === 'POST') {
      const post = await setStatus(env, id, 'published');
      return post ? json({ post }) : json({ error: 'not found' }, { status: 404 });
    }
    if (id && action === 'unpublish' && method === 'POST') {
      const post = await setStatus(env, id, 'draft');
      return post ? json({ post }) : json({ error: 'not found' }, { status: 404 });
    }
  }

  return json({ error: 'not found' }, { status: 404 });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/img/')) {
      return serveImage(url.pathname.slice('/img/'.length), env);
    }

    if (url.pathname.startsWith('/api/')) {
      try {
        return await handleApi(request, env, url);
      } catch (e) {
        if (e instanceof AuthError) {
          return json({ error: e.message }, { status: e.status });
        }
        console.error(e);
        return json({ error: 'internal error' }, { status: 500 });
      }
    }

    // Inject the CMS content script into the homepage automatically,
    // so design file updates never need manual CMS modifications.
    if (url.pathname === '/' || url.pathname === '/index.html') {
      const resp = await env.ASSETS.fetch(request);
      if (!resp.headers.get('content-type')?.includes('text/html')) return resp;
      let html = await resp.text();
      if (!html.includes('/cms-content.js')) {
        html = html.replace('</body>', '<script src="/cms-content.js"></script></body>');
      }
      return new Response(html, {
        status: resp.status,
        headers: { ...Object.fromEntries(resp.headers), 'content-type': 'text/html; charset=utf-8' },
      });
    }

    return env.ASSETS.fetch(request);
  },
};
