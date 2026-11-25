module.exports = {
    dependency: {
        platforms: {
            // iOS metadata is auto-discovered from `react-native-tdlib.podspec`.
            // The schema in @react-native-community/cli v20+ rejects `podspecPath`
            // and `sourceDir` here and silently drops the entire `platforms` map,
            // which breaks autolinking on RN >= 0.78.
            ios: {},
            // sourceDir is left out on purpose: the CLI and Expo autolinking
            // both path.join() it onto the package root, so an absolute path
            // doubles and the module silently drops out. The default `android`
            // directory is found without it. The package class must stay
            // explicit, since the manifest package does not match its Java
            // package.
            android: {
                packageImportPath: 'import com.reactnativetdlib.tdlibclient.TdLibPackage;',
                packageInstance: 'new TdLibPackage()',
            },
        },
    },
};
