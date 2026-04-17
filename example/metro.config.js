/**
 * Metro configuration for React Native
 * https://github.com/facebook/react-native
 *
 * @format
 */

const path = require('path');

const projectRoot = __dirname;
const packageRoot = path.resolve(projectRoot, '..');

module.exports = {
  projectRoot,
  watchFolders: [packageRoot],
  resolver: {
    // Follow the react-native-tdlib symlink → parent repo
    extraNodeModules: new Proxy(
      {},
      {
        get: (_t, name) => {
          if (name === 'react-native-tdlib') return packageRoot;
          return path.join(projectRoot, 'node_modules', name);
        },
      },
    ),
    // Avoid duplicate React / RN when the parent repo has its own node_modules
    blockList: [
      new RegExp(`${packageRoot}/node_modules/react/.*`),
      new RegExp(`${packageRoot}/node_modules/react-native/.*`),
    ],
  },
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
};
