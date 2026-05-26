import { requireAdmin, AuthError } from './auth.js';
import {
  listPosts, getPost, createPost, updatePost, setStatus, deletePost,
} from './posts.js';
import {
  listProposals, getProposal, createProposal, updateProposal,
  setProposalStatus, deleteProposal,
} from './proposals.js';
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

  // Public: single post by id — returns published post without auth; drafts require auth.
  const singleM = pathname.match(/^\/api\/posts\/([A-Za-z0-9_-]+)$/);
  if (singleM && method === 'GET') {
    const post = await getPost(env, singleM[1]);
    if (!post) return json({ error: 'not found' }, { status: 404 });
    if (post.status !== 'published') await requireAdmin(request, env);
    return json({ post });
  }

  // Public: single proposal by unguessable id — returns 'sent' proposal without auth.
  const propSingleM = pathname.match(/^\/api\/proposals\/([A-Za-z0-9_-]+)$/);
  if (propSingleM && method === 'GET') {
    const proposal = await getProposal(env, propSingleM[1]);
    if (!proposal) return json({ error: 'not found' }, { status: 404 });
    if (proposal.status !== 'sent') await requireAdmin(request, env);
    return json({ proposal });
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

  // Admin: proposals.
  if (pathname === '/api/proposals' && method === 'GET') {
    const statusParam = url.searchParams.get('status');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 200);
    const proposals = await listProposals(env, { status: statusParam || undefined, limit });
    return json({ proposals });
  }

  const pm = pathname.match(/^\/api\/proposals(?:\/([A-Za-z0-9_-]+))?(?:\/(send|unsend))?$/);
  if (pm) {
    const id = pm[1];
    const action = pm[2];

    if (!id && method === 'POST') {
      const body = await readJson(request);
      const proposal = await createProposal(env, body, user.email);
      return json({ proposal }, { status: 201 });
    }
    if (id && !action && method === 'GET') {
      const proposal = await getProposal(env, id);
      return proposal ? json({ proposal }) : json({ error: 'not found' }, { status: 404 });
    }
    if (id && !action && (method === 'PATCH' || method === 'PUT')) {
      const body = await readJson(request);
      const proposal = await updateProposal(env, id, body);
      return proposal ? json({ proposal }) : json({ error: 'not found' }, { status: 404 });
    }
    if (id && !action && method === 'DELETE') {
      const proposal = await deleteProposal(env, id);
      return proposal ? json({ ok: true }) : json({ error: 'not found' }, { status: 404 });
    }
    if (id && action === 'send' && method === 'POST') {
      const proposal = await setProposalStatus(env, id, 'sent');
      return proposal ? json({ proposal }) : json({ error: 'not found' }, { status: 404 });
    }
    if (id && action === 'unsend' && method === 'POST') {
      const proposal = await setProposalStatus(env, id, 'draft');
      return proposal ? json({ proposal }) : json({ error: 'not found' }, { status: 404 });
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

    return env.ASSETS.fetch(request);
  },
};
