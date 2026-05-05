import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://runsigil.com',
  integrations: [
    starlight({
      title: 'sigil',
      logo: {
        src: './src/assets/sigil-logo.svg',
        replacesTitle: true,
      },
      favicon: '/favicon.svg',
      social: [],
      sidebar: [
        {
          label: 'Getting Started',
          items: [
            { label: 'Quickstart', slug: 'quickstart' },
            { label: 'Installation', slug: 'installation' },
          ],
        },
        {
          label: 'Concepts',
          items: [
            { label: 'Dark Factory', slug: 'concepts/dark-factory' },
            { label: 'Trust Model', slug: 'concepts/trust-model' },
            { label: 'Invariants', slug: 'concepts/invariants' },
            { label: 'Ledger', slug: 'concepts/ledger' },
            { label: 'Fit and Limitations', slug: 'concepts/fit-limitations' },
          ],
        },
        {
          label: 'Guides',
          items: [
            { label: 'Writing Scenarios', slug: 'guides/writing-scenarios' },
            { label: 'CI Integration', slug: 'guides/ci-integration' },
            { label: 'Configuring Judges', slug: 'guides/configuring-judges' },
          ],
        },
        {
          label: 'Integrations',
          items: [
            { label: 'GitHub Actions', slug: 'integrations/github-actions' },
          ],
        },
        {
          label: 'Reference',
          items: [
            { label: 'Lua DSL', slug: 'reference/lua-dsl' },
            { label: 'Configuration', slug: 'reference/configuration' },
            { label: 'CLI', slug: 'reference/cli' },
            { label: 'Changelog', slug: 'changelog' },
          ],
        },
      ],
      customCss: ['./src/styles/custom.css'],
      head: [
        {
          tag: 'script',
          content: 'document.documentElement.dataset.theme="dark";',
        },
        { tag: 'link', attrs: { rel: 'preconnect', href: 'https://fonts.googleapis.com' } },
        { tag: 'link', attrs: { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: true } },
        {
          tag: 'link',
          attrs: {
            rel: 'stylesheet',
            href: 'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap',
          },
        },
        { tag: 'link', attrs: { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' } },
        { tag: 'link', attrs: { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' } },
        { tag: 'link', attrs: { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' } },
        { tag: 'link', attrs: { rel: 'manifest', href: '/manifest.webmanifest' } },
      ],
      disable404Route: false,
      components: {
        Head: './src/components/StarlightHead.astro',
        PageTitle: './src/components/StarlightPageTitle.astro',
        TableOfContents: './src/components/StarlightTableOfContents.astro',
        ThemeSelect: './src/components/ThemeSelect.astro',
      },
    }),
  ],
});
