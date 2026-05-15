/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  docs: [
    'intro',
    {
      type: 'category',
      label: 'Getting Started',
      items: ['getting-started/installation', 'getting-started/configuration'],
      collapsed: false,
    },
    {
      type: 'category',
      label: 'API',
      items: ['api/overview'],
    },
  ],
};

module.exports = sidebars;
