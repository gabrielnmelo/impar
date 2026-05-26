const MAX_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']);

function extFor(type) {
  return { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
           'image/gif': 'gif', 'image/avif': 'avif' }[type] || 'bin';
}

export async function uploadImage(request, env) {
  const ct = request.headers.get('content-type') || '';
  let blob, type;
  if (ct.startsWith('multipart/form-data')) {
    const form = await request.formData();
    const f = form.get('file');
    if (!f || typeof f === 'string') return new Response('No file', { status: 400 });
    blob = f;
    type = f.type;
  } else {
    type = ct;
    blob = await request.blob();
  }
  if (!ALLOWED.has(type)) {
    return Response.json({ error: `Unsupported type: ${type}` }, { status: 415 });
  }
  const buf = await blob.arrayBuffer();
  if (buf.byteLength > MAX_BYTES) {
    return Response.json({ error: 'File too large (max 8MB)' }, { status: 413 });
  }
  const id = crypto.randomUUID().replace(/-/g, '').slice(0, 20);
  const key = `${id}.${extFor(type)}`;
  await env.IMAGES.put(key, buf, { httpMetadata: { contentType: type } });
  return Response.json({ key, url: `/img/${key}` }, { status: 201 });
}

export async function serveImage(key, env) {
  const obj = await env.IMAGES.get(key);
  if (!obj) return new Response('Not found', { status: 404 });
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('etag', obj.httpEtag);
  headers.set('cache-control', 'public, max-age=31536000, immutable');
  return new Response(obj.body, { headers });
}
