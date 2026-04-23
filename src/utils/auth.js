/**
 * Helpers for DatasetGateway-backed browser auth.
 *
 * Flow (matches neuPrintHTTP + neuPrintExplorer):
 *   1. User clicks LOGIN → browser navigates to `${authBase}/login?redirect=<url>`.
 *   2. clio-store redirects to DSG's /api/v1/authorize.
 *   3. DSG runs Google OAuth, sets an HttpOnly `dsg_token` cookie scoped to
 *      `.janelia.org`, redirects back to <url>.
 *   4. clio_website loads; we call `/profile` with credentials:'include' to
 *      confirm the session, then POST `/server/token` to get a long-lived
 *      DSG-issued JWT we can use as a Bearer token with the rest of the API.
 */

// clio-store's auth routes (/login, /profile, /logout) are registered at the
// top level, not under /v2/. Strip a trailing /v2 (or /v2/) from projectUrl to
// get the base.
export function authBaseFromProjectUrl(projectUrl) {
  if (!projectUrl) return '';
  return projectUrl.replace(/\/v2\/?$/, '');
}

// Some DSG token responses are a bare string; others are JSON with a "token"
// field. Normalise to a string.
export function normalizeTokenResponse(body) {
  if (typeof body === 'string') return body;
  if (body && typeof body === 'object') {
    return body.token || body.access_token || '';
  }
  return '';
}
