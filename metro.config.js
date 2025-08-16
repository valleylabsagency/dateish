// metro.config.js
const { getDefaultConfig } = require('@expo/metro-config');

/** @type {import('@expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Keep this only if you truly need it for a package-exports issue.
// Otherwise, delete the next line.
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
