export class AuthError extends Error {
  constructor(message, status = 401) {
    super(message);
    this.status = status;
  }
}

export async function requireAdmin(request, env) {
  if (!env.CMS_PASSWORD) {
    throw new AuthError('CMS_PASSWORD secret not configured', 500);
  }
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) throw new AuthError('Credenciais ausentes');

  const enc = new TextEncoder();
  const a = enc.encode(token);
  const b = enc.encode(env.CMS_PASSWORD);
  if (a.length !== b.length) throw new AuthError('Senha incorreta');
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  if (diff !== 0) throw new AuthError('Senha incorreta');

  return { email: 'admin' };
}
