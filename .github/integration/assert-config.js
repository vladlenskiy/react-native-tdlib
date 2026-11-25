// Run from the generated app's root. Fails unless the React Native CLI
// autolinks react-native-tdlib on both platforms.
const {execSync} = require('child_process');

const config = JSON.parse(
  execSync('npx react-native config', {encoding: 'utf8', maxBuffer: 64 << 20}),
);
const dep = config.dependencies['react-native-tdlib'];
const problems = [];

if (!dep) {
  problems.push('react-native-tdlib is missing from `react-native config`');
} else {
  const android = dep.platforms.android;
  const ios = dep.platforms.ios;
  if (!android) {
    problems.push('android entry is null, so the module would not be autolinked');
  } else if (
    android.packageImportPath !==
    'import com.reactnativetdlib.tdlibclient.TdLibPackage;'
  ) {
    problems.push(`unexpected packageImportPath: ${android.packageImportPath}`);
  }
  if (!ios || !ios.podspecPath) {
    problems.push('ios entry has no podspecPath');
  }
  console.log(JSON.stringify({android, ios}, null, 2));
}

if (problems.length) {
  problems.forEach(p => console.error(`::error::${p}`));
  process.exit(1);
}
console.log('autolinking config OK');
