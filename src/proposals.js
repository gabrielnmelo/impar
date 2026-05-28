function rowToProposal(row) {
  if (!row) return null;
  let line_items = [];
  let scope_in = [];
  let scope_out = [];
  try { line_items = JSON.parse(row.line_items || '[]'); } catch {}
  try { scope_in = JSON.parse(row.scope_in || '[]'); } catch {}
  try { scope_out = JSON.parse(row.scope_out || '[]'); } catch {}
  return {
    id: row.id,
    title: row.title,
    client_name: row.client_name,
    body_html: row.body_html,
    line_items,
    valid_until: row.valid_until,
    payment_terms: row.payment_terms,
    timeline: row.timeline,
    scope_in,
    scope_out,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    sent_at: row.sent_at,
    author_email: row.author_email,
  };
}

function newId() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

function normalizeLineItems(input) {
  if (!Array.isArray(input)) return [];
  return input.map(it => ({
    description: String(it.description || '').slice(0, 500),
    unit_price: Number.isFinite(+it.unit_price) ? +it.unit_price : 0,
  })).filter(it => it.description || it.unit_price);
}

function normalizeScope(input) {
  if (!Array.isArray(input)) return [];
  return input
    .map(s => String(s || '').trim())
    .filter(Boolean)
    .slice(0, 50);
}

export async function listProposals(env, { status, limit = 50 } = {}) {
  const where = status ? 'WHERE status = ?' : '';
  const bind = status ? [status] : [];
  const stmt = env.DB.prepare(
    `SELECT * FROM proposals ${where} ORDER BY updated_at DESC LIMIT ?`
  ).bind(...bind, limit);
  const { results } = await stmt.all();
  return results.map(rowToProposal);
}

export async function getProposal(env, id) {
  const row = await env.DB.prepare('SELECT * FROM proposals WHERE id = ?').bind(id).first();
  return rowToProposal(row);
}

export async function findProposalByPrefix(env, prefix) {
  const row = await env.DB.prepare(
    'SELECT * FROM proposals WHERE id LIKE ? LIMIT 1'
  ).bind(prefix + '%').first();
  return rowToProposal(row);
}

export async function createProposal(env, input, authorEmail) {
  const id = newId();
  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO proposals (
       id, title, client_name, body_html, line_items, valid_until,
       payment_terms, timeline, scope_in, scope_out,
       status, created_at, updated_at, author_email
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)`
  ).bind(
    id,
    (input.title || '').trim(),
    (input.client_name || '').trim(),
    input.body_html || '',
    JSON.stringify(normalizeLineItems(input.line_items)),
    input.valid_until || null,
    (input.payment_terms || '').trim(),
    (input.timeline || '').trim(),
    JSON.stringify(normalizeScope(input.scope_in)),
    JSON.stringify(normalizeScope(input.scope_out)),
    now, now, authorEmail,
  ).run();
  return getProposal(env, id);
}

export async function updateProposal(env, id, input) {
  const existing = await getProposal(env, id);
  if (!existing) return null;
  const title = input.title !== undefined ? input.title.trim() : existing.title;
  const client_name = input.client_name !== undefined ? input.client_name.trim() : existing.client_name;
  const body_html = input.body_html !== undefined ? input.body_html : existing.body_html;
  const line_items = input.line_items !== undefined
    ? JSON.stringify(normalizeLineItems(input.line_items))
    : JSON.stringify(existing.line_items);
  const valid_until = input.valid_until !== undefined ? input.valid_until : existing.valid_until;
  const payment_terms = input.payment_terms !== undefined ? input.payment_terms.trim() : existing.payment_terms;
  const timeline = input.timeline !== undefined ? input.timeline.trim() : existing.timeline;
  const scope_in = input.scope_in !== undefined
    ? JSON.stringify(normalizeScope(input.scope_in))
    : JSON.stringify(existing.scope_in);
  const scope_out = input.scope_out !== undefined
    ? JSON.stringify(normalizeScope(input.scope_out))
    : JSON.stringify(existing.scope_out);

  await env.DB.prepare(
    `UPDATE proposals SET
       title=?, client_name=?, body_html=?, line_items=?, valid_until=?,
       payment_terms=?, timeline=?, scope_in=?, scope_out=?, updated_at=?
     WHERE id=?`
  ).bind(
    title, client_name, body_html, line_items, valid_until,
    payment_terms, timeline, scope_in, scope_out, Date.now(), id,
  ).run();
  return getProposal(env, id);
}

export async function setProposalStatus(env, id, status) {
  const now = Date.now();
  const sent_at = status === 'sent' ? now : null;
  const r = await env.DB.prepare(
    `UPDATE proposals SET status=?, sent_at=?, updated_at=? WHERE id=?`
  ).bind(status, sent_at, now, id).run();
  if (!r.success || r.meta.changes === 0) return null;
  return getProposal(env, id);
}

export async function deleteProposal(env, id) {
  const p = await getProposal(env, id);
  if (!p) return null;
  await env.DB.prepare('DELETE FROM proposals WHERE id=?').bind(id).run();
  return p;
}

export async function duplicateProposal(env, id, authorEmail) {
  const src = await getProposal(env, id);
  if (!src) return null;
  const newId_ = newId();
  const now = Date.now();
  const title = src.title ? `Cópia de ${src.title}` : 'Cópia';
  await env.DB.prepare(
    `INSERT INTO proposals (
       id, title, client_name, body_html, line_items, valid_until,
       payment_terms, timeline, scope_in, scope_out,
       status, created_at, updated_at, author_email
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)`
  ).bind(
    newId_,
    title,
    src.client_name || '',
    src.body_html || '',
    JSON.stringify(src.line_items || []),
    src.valid_until || null,
    src.payment_terms || '',
    src.timeline || '',
    JSON.stringify(src.scope_in || []),
    JSON.stringify(src.scope_out || []),
    now, now, authorEmail,
  ).run();
  return getProposal(env, newId_);
}
