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
      label: 'Features',
      items: [
        'features/inventory',
        'features/locations-labels',
        'features/asset-ids',
        'features/maintenance',
        'features/maintenance-schedules',
        'features/electrical-panels',
        'features/homes',
      ],
      collapsed: false,
    },
    'mobile',
    {
      type: 'category',
      label: 'API',
      items: ['api/overview'],
    },
  ],
};

module.exports = sidebars;
