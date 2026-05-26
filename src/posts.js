function rowToPost(row) {
  if (!row) return null;
  let tags = [];
  try { tags = JSON.parse(row.tags || '[]'); } catch {}
  return {
    id: row.id,
    title: row.title,
    tags,
    body_html: row.body_html,
    excerpt: row.excerpt,
    image_key: row.image_key,
    image_url: row.image_key ? `/img/${row.image_key}` : null,
    read_minutes: row.read_minutes,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    published_at: row.published_at,
    author_email: row.author_email,
  };
}

function stripHtml(html) {
  return (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function estimateReadMinutes(html) {
  const words = stripHtml(html).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

function deriveExcerpt(html, max = 160) {
  const text = stripHtml(html);
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd() + '…';
}

function newId() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 16);
}

export async function listPosts(env, { status, limit = 12 } = {}) {
  const where = status ? 'WHERE status = ?' : '';
  const order = status === 'draft' ? 'updated_at DESC' : 'published_at DESC, updated_at DESC';
  const bind = status ? [status] : [];
  const stmt = env.DB.prepare(
    `SELECT * FROM posts ${where} ORDER BY ${order} LIMIT ?`
  ).bind(...bind, limit);
  const { results } = await stmt.all();
  return results.map(rowToPost);
}

export async function getPost(env, id) {
  const row = await env.DB.prepare('SELECT * FROM posts WHERE id = ?').bind(id).first();
  return rowToPost(row);
}

export async function createPost(env, input, authorEmail) {
  const id = newId();
  const now = Date.now();
  const title = (input.title || '').trim() || 'Sem título';
  const tags = JSON.stringify(Array.isArray(input.tags) ? input.tags : []);
  const body_html = input.body_html || '';
  const excerpt = input.excerpt || deriveExcerpt(body_html);
  const read_minutes = estimateReadMinutes(body_html);
  await env.DB.prepare(
    `INSERT INTO posts (id, title, tags, body_html, excerpt, image_key, read_minutes,
                        status, created_at, updated_at, author_email)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)`
  ).bind(id, title, tags, body_html, excerpt, input.image_key || null,
         read_minutes, now, now, authorEmail).run();
  return getPost(env, id);
}

export async function updatePost(env, id, input) {
  const existing = await getPost(env, id);
  if (!existing) return null;
  const title = input.title !== undefined ? input.title.trim() || 'Sem título' : existing.title;
  const tags = input.tags !== undefined ? JSON.stringify(input.tags) : JSON.stringify(existing.tags);
  const body_html = input.body_html !== undefined ? input.body_html : existing.body_html;
  const image_key = input.image_key !== undefined ? input.image_key : existing.image_key;
  const excerpt = input.excerpt !== undefined ? input.excerpt : deriveExcerpt(body_html);
  const read_minutes = estimateReadMinutes(body_html);
  await env.DB.prepare(
    `UPDATE posts SET title=?, tags=?, body_html=?, excerpt=?, image_key=?,
                      read_minutes=?, updated_at=?
     WHERE id=?`
  ).bind(title, tags, body_html, excerpt, image_key, read_minutes, Date.now(), id).run();
  return getPost(env, id);
}

export async function setStatus(env, id, status) {
  const now = Date.now();
  const published_at = status === 'published' ? now : null;
  const r = await env.DB.prepare(
    `UPDATE posts SET status=?, published_at=?, updated_at=? WHERE id=?`
  ).bind(status, published_at, now, id).run();
  if (!r.success || r.meta.changes === 0) return null;
  return getPost(env, id);
}

export async function deletePost(env, id) {
  const post = await getPost(env, id);
  if (!post) return null;
  await env.DB.prepare('DELETE FROM posts WHERE id=?').bind(id).run();
  return post;
}
