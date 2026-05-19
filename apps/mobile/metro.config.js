const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch all files within the monorepo (needed for workspace packages)
config.watchFolders = [monorepoRoot];

// Let Metro resolve packages from both the app's and monorepo root node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// pnpm uses symlinks — enable symlink resolution
config.resolver.unstable_enableSymlinks = true;

module.exports = config;
