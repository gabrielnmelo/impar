import { jwtVerify, createRemoteJWKSet } from 'jose';

let cachedJWKS = null;
let cachedTeamDomain = null;

function getJWKS(teamDomain) {
  if (cachedJWKS && cachedTeamDomain === teamDomain) return cachedJWKS;
  cachedTeamDomain = teamDomain;
  cachedJWKS = createRemoteJWKSet(
    new URL(`https://${teamDomain}/cdn-cgi/access/certs`)
  );
  return cachedJWKS;
}

export class AuthError extends Error {
  constructor(message, status = 401) {
    super(message);
    this.status = status;
  }
}

export async function requireAdmin(request, env) {
  if (!env.CF_ACCESS_TEAM_DOMAIN || !env.CF_ACCESS_AUD) {
    throw new AuthError('Cloudflare Access is not configured on this Worker', 500);
  }
  const jwt = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!jwt) throw new AuthError('Missing Access JWT');
  try {
    const { payload } = await jwtVerify(jwt, getJWKS(env.CF_ACCESS_TEAM_DOMAIN), {
      issuer: `https://${env.CF_ACCESS_TEAM_DOMAIN}`,
      audience: env.CF_ACCESS_AUD,
    });
    return { email: payload.email, sub: payload.sub };
  } catch {
    throw new AuthError('Invalid Access JWT');
  }
}
