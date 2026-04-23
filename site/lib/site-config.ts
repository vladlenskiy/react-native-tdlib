const repoUrl = "https://github.com/vladlenskiy/react-native-tdlib";
// `HEAD` resolves to the repository's default branch on github.com, so these
// URLs survive a `master` → `main` rename without a code change here.
const treeHead = `${repoUrl}/tree/HEAD`;

export const siteConfig = {
  name: "react-native-tdlib",
  tagline: "Build a real Telegram client in React Native.",
  description:
    "Official TDLib under the hood, prebuilt binaries, one API on iOS and Android. No C++ compilation, no platform forks.",
  repo: "vladlenskiy/react-native-tdlib",
  repoUrl,
  docsUrl: `${treeHead}/docs`,
  gettingStartedUrl: `${treeHead}/docs/getting-started.md`,
  exampleUrl: `${treeHead}/example`,
  npmUrl: "https://www.npmjs.com/package/react-native-tdlib",
  sponsorUrl: "https://github.com/sponsors/vladlenskiy",
  xUrl: "https://x.com/vladlensk1y",
} as const;
