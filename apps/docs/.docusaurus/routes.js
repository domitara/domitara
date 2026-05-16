import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/domitara/',
    component: ComponentCreator('/domitara/', '676'),
    routes: [
      {
        path: '/domitara/',
        component: ComponentCreator('/domitara/', '74e'),
        routes: [
          {
            path: '/domitara/',
            component: ComponentCreator('/domitara/', '12f'),
            routes: [
              {
                path: '/domitara/api/overview',
                component: ComponentCreator('/domitara/api/overview', '129'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/domitara/getting-started/configuration',
                component: ComponentCreator('/domitara/getting-started/configuration', '439'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/domitara/getting-started/installation',
                component: ComponentCreator('/domitara/getting-started/installation', '635'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/domitara/',
                component: ComponentCreator('/domitara/', '0e4'),
                exact: true,
                sidebar: "docs"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    path: '*',
    component: ComponentCreator('*'),
  },
];
