/**
 * Ponteto: cookie for the public site (ponteto.com) so its header can show
 * the client's name instead of «Войти».
 *
 * Holds ONLY a short display name (no token, no id, no email), is readable by
 * the site's JS on the parent domain and is removed on logout. Written only
 * when the cabinet runs on a ponteto.com host, so local dev and other
 * deployments are untouched.
 */
export const SITE_NAME_COOKIE = 'ponteto_name';
const SITE_DOMAIN = 'ponteto.com';
const MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
const MAX_NAME_LENGTH = 32;

export interface SiteNameSource {
  first_name?: string | null;
  username?: string | null;
}

/** First name, else Telegram username; never email or numeric ids. */
export function siteDisplayName(user?: SiteNameSource | null): string {
  if (!user) return '';
  const raw = user.first_name?.trim() || user.username?.trim() || '';
  // Strip control characters; keep the value short for a header button.
  const clean = Array.from(raw)
    .filter((ch) => {
      const code = ch.codePointAt(0) ?? 0;
      return code > 0x1f && code !== 0x7f;
    })
    .join('')
    .trim();
  return Array.from(clean).slice(0, MAX_NAME_LENGTH).join('');
}

function cookieDomain(hostname: string): string | null {
  const host = hostname.toLowerCase();
  if (host === SITE_DOMAIN || host.endsWith(`.${SITE_DOMAIN}`)) return `.${SITE_DOMAIN}`;
  return null;
}

export function writeSiteNameCookie(
  user: SiteNameSource | null,
  doc: Pick<Document, 'cookie'> = document,
  hostname: string = window.location.hostname,
): void {
  const domain = cookieDomain(hostname);
  if (!domain) return;
  const value = encodeURIComponent(siteDisplayName(user));
  doc.cookie = `${SITE_NAME_COOKIE}=${value}; Domain=${domain}; Path=/; Max-Age=${MAX_AGE_SECONDS}; SameSite=Lax; Secure`;
}

export function clearSiteNameCookie(
  doc: Pick<Document, 'cookie'> = document,
  hostname: string = window.location.hostname,
): void {
  const domain = cookieDomain(hostname);
  if (!domain) return;
  doc.cookie = `${SITE_NAME_COOKIE}=; Domain=${domain}; Path=/; Max-Age=0; SameSite=Lax; Secure`;
}

interface AuthSnapshot {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: SiteNameSource | null;
}

/**
 * Keeps the cookie in step with the auth store. While the session is still
 * being restored (isLoading) nothing is touched, so a page reload does not
 * flash the site back to «Войти».
 */
export function syncSiteNameCookie(
  state: AuthSnapshot,
  doc: Pick<Document, 'cookie'> = document,
  hostname: string = window.location.hostname,
): void {
  if (state.isLoading) return;
  if (state.isAuthenticated && state.user) writeSiteNameCookie(state.user, doc, hostname);
  else clearSiteNameCookie(doc, hostname);
}
