export const SITE = {
  name: 'Sigil',
  origin: 'https://runsigil.com',
  email: 'info@runsigil.com',
  github: 'https://github.com/bobisme/sigil-releases',
  releases: 'https://github.com/bobisme/sigil-releases/releases/latest',
  installUrl: 'https://runsigil.com/install.sh',
  ogImage: 'https://runsigil.com/og/sigil-card.png',
  description:
    'Sigil turns markdown specs into verified merge decisions for coding agents. You write the intent, the agent writes the code, and Sigil handles the rest.',
};

export const docsSections: Record<string, string> = {
  quickstart: 'Getting Started',
  installation: 'Getting Started',
  concepts: 'Concepts',
  guides: 'Guides',
  integrations: 'Integrations',
  reference: 'Reference',
  changelog: 'Reference',
};

export function absoluteUrl(pathname = '/') {
  return new URL(pathname, SITE.origin).href;
}

export function sectionForPath(pathname: string) {
  const clean = pathname.replace(/^\/+|\/+$/g, '');
  const first = clean.split('/')[0] || '';
  return docsSections[first] || 'Docs';
}

export function jsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
