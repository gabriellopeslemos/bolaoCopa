// Metro configuration for the Expo app living inside the monorepo.
//
// The app consumes the local `@bolao/scoring` package, which is symlinked into
// node_modules but physically lives at ../packages/scoring (outside this app
// folder). By default Metro only watches/resolves files under the project root,
// so we widen `watchFolders` to the monorepo root and let it resolve modules
// from both the app's and the monorepo root's node_modules.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

module.exports = config;
