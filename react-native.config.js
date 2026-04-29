const path = require('path');

module.exports = {
    dependency: {
        platforms: {
            // iOS metadata is auto-discovered from `react-native-tdlib.podspec`.
            // The schema in @react-native-community/cli v20+ rejects `podspecPath`
            // and `sourceDir` here and silently drops the entire `platforms` map,
            // which breaks autolinking on RN >= 0.78.
            ios: {},
            android: {
                sourceDir: path.join(__dirname, 'android'),
                packageImportPath: 'import com.reactnativetdlib.tdlibclient.TdLibPackage;',
                packageInstance: 'new TdLibPackage()',
            },
        },
    },
};
