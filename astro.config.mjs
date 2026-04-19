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
      ],
      disable404Route: false,
      components: {
        ThemeSelect: './src/components/ThemeSelect.astro',
      },
    }),
  ],
});
