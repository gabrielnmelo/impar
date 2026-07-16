import { requireAdmin, AuthError } from './auth.js';
import {
  listPosts, getPost, createPost, updatePost, setStatus, deletePost,
} from './posts.js';
import {
  listProposals, getProposal, createProposal, updateProposal,
  setProposalStatus, deleteProposal, duplicateProposal, findProposalByPrefix,
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

  // Public: contact form submission — sends email via Resend.
  if (pathname === '/api/contact' && method === 'POST') {
    const body = await readJson(request);
    const { nome, email, telefone, interesse, desafio } = body;

    const hasContact = email || telefone;
    if (!hasContact) {
      return json({ error: 'Informe e-mail ou telefone.' }, { status: 400 });
    }

    if (!env.RESEND_API_KEY) {
      return json({ error: 'Serviço de e-mail não configurado.' }, { status: 503 });
    }

    const lbl = 'display:block;font-size:10px;letter-spacing:0.07em;text-transform:uppercase;color:#7A97FE;margin-bottom:8px;';
    const val = 'font-size:18px;color:#ffffff;';
    const link = 'font-size:18px;color:#ffffff;text-decoration:underline;';

    const contactExists = nome || email || telefone;

    // Contact values — linked for email/phone, forced white
    const emailVal    = email    ? `<a href="mailto:${email}" style="${link}"><span style="color:#ffffff;">${email}</span></a>`       : '';
    const telefoneVal = telefone ? `<a href="tel:${telefone}" style="${link}"><span style="color:#ffffff;">${telefone}</span></a>` : '';

    const contactSection = contactExists ? (() => {
      const items = [
        nome     ? `<div style="display:inline-block;vertical-align:top;padding-right:28px;white-space:nowrap;"><span class="lbl" style="${lbl}">Nome</span><span style="${val}">${nome}</span></div>`     : '',
        email    ? `<div style="display:inline-block;vertical-align:top;padding-right:28px;white-space:nowrap;"><span class="lbl" style="${lbl}">E-mail</span>${emailVal}</div>`    : '',
        telefone ? `<div style="display:inline-block;vertical-align:top;white-space:nowrap;"><span class="lbl" style="${lbl}">Telefone</span>${telefoneVal}</div>` : '',
      ].filter(Boolean).join('');
      return `<div style="margin-top:44px;">${items}</div>`;
    })() : '';

    const msgSection = desafio ? `
      <div style="margin-top:44px;">
        <span class="lbl" style="${lbl}">Mensagem</span>
        <div style="font-size:32px;color:#ffffff;line-height:1.25;letter-spacing:-0.02em;">${desafio}</div>
      </div>` : '';

    const emailHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  @font-face{font-family:'PPTelegraf';src:url('https://imparcom.com/assets/fonts/PPTelegraf-Regular.otf') format('opentype');font-weight:400;font-style:normal;}
  body,td,div,span,p{font-family:'PPTelegraf',-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;}
  a{color:#ffffff!important;text-decoration:underline!important;}
  [data-ogsc] .card{background-color:#0C35C3!important;}
  [data-ogsc] .card *{color:#ffffff!important;}
  [data-ogsc] .card .lbl{color:#7A97FE!important;}
</style></head>
<body style="margin:0;padding:0;background:#f0f1f8;font-family:'PPTelegraf',-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0f1f8;">
  <tr><td align="center" style="padding:40px 16px;">
    <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
      <tr><td class="card" style="background:#0C35C3;padding:32px 44px 52px 40px;border-radius:12px;">
        <img src="https://imparcom.com/assets/logo-top-bar-white.svg" alt="Ímpar" height="25" style="display:block;border:0;">
        ${msgSection}
        ${contactSection}
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;

    const emailText = [
      'Nova mensagem — imparcom.com',
      '',
      nome      ? `Nome:      ${nome}`      : '',
      email     ? `E-mail:    ${email}`     : '',
      telefone  ? `Telefone:  ${telefone}`  : '',
      interesse ? `Interesse: ${interesse}` : '',
      desafio   ? `\nMensagem:\n${desafio}` : '',
    ].filter(Boolean).join('\n').trim();

    const subject = nome ? `Novo contato: ${nome}` : interesse ? `Novo contato — ${interesse}` : 'Novo contato via imparcom.com';

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Formulário Ímpar <formulario@imparcom.com>',
        to: ['gnevesmelo@gmail.com'],
        reply_to: email || undefined,
        subject,
        html: emailHtml,
        text: emailText,
      }),
    });

    if (!resendRes.ok) {
      const err = await resendRes.text();
      console.error('Resend error:', err);
      return json({ error: 'Falha ao enviar mensagem. Tente novamente.' }, { status: 502 });
    }

    return json({ ok: true });
  }

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

  const pm = pathname.match(/^\/api\/proposals(?:\/([A-Za-z0-9_-]+))?(?:\/(send|unsend|duplicate))?$/);
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
    if (id && action === 'duplicate' && method === 'POST') {
      const proposal = await duplicateProposal(env, id, user.email);
      return proposal ? json({ proposal }, { status: 201 }) : json({ error: 'not found' }, { status: 404 });
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

    if (url.pathname.startsWith('/p/')) {
      const shortCode = url.pathname.slice(3).replace(/\/$/, '');
      if (/^[A-Za-z0-9_-]{6,16}$/.test(shortCode)) {
        try {
          const match = await findProposalByPrefix(env, shortCode);
          if (match) {
            return Response.redirect(`${url.origin}/proposal.html?id=${match.id}`, 302);
          }
        } catch (e) {
          console.error('Short link lookup failed:', e);
        }
      }
      return new Response('Proposta não encontrada', { status: 404 });
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
