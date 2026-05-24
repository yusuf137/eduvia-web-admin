export const PANEL_BASE_DOMAIN = 'eduviaapp.com';

export const RESERVED_SUBDOMAINS = ['www', 'panel', 'admin', 'api'];

export function getSubdomain() {
  const host = window.location.hostname;

  if (host === 'localhost' || host === '127.0.0.1') {
    return null;
  }

  const parts = host.split('.');

  if (host === PANEL_BASE_DOMAIN || host === `www.${PANEL_BASE_DOMAIN}`) {
    return null;
  }

  if (parts.length >= 3 && host.endsWith(PANEL_BASE_DOMAIN)) {
    const sub = parts[0];
    if (RESERVED_SUBDOMAINS.includes(sub)) {
      return null;
    }
    return sub;
  }

  return null;
}

export function getInstitutionPanelHost(slug) {
  const clean = String(slug ?? '').trim();
  if (!clean) {
    return '';
  }
  return `${clean}.${PANEL_BASE_DOMAIN}`;
}

export function getInstitutionPanelUrl(slug) {
  const host = getInstitutionPanelHost(slug);
  if (!host) {
    return '';
  }
  return `https://${host}`;
}
