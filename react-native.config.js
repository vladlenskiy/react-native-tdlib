const path = require('path');

module.exports = {
    dependency: {
        platforms: {
            ios: {
                podspecPath: 'react-native-tdlib.podspec',
                sourceDir: path.join(__dirname, 'ios'),
            },
            android: {
                sourceDir: path.join(__dirname, 'android'),
                packageImportPath: 'import com.reactnativetdlib.tdlibclient.TdLibPackage;',
                packageInstance: 'new TdLibPackage()',
            },
        },
    },
    dependencies: {
        'react-native-tdlib': {
            root: __dirname,
        },
    },
};
