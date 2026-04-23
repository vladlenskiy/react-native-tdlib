import { getLatestRelease } from "@/lib/release";
import { siteConfig } from "@/lib/site-config";

export function JsonLd() {
  const release = getLatestRelease();

  const software = {
    "@context": "https://schema.org",
    "@type": "SoftwareSourceCode",
    name: "react-native-tdlib",
    description:
      "React Native bindings for Telegram's official TDLib, with prebuilt iOS and Android binaries and a single typed API for chats, messages, reactions, files, and real-time updates.",
    programmingLanguage: ["TypeScript", "Objective-C", "Kotlin"],
    runtimePlatform: ["iOS", "Android", "React Native"],
    codeRepository: siteConfig.repoUrl,
    license: "https://spdx.org/licenses/MIT.html",
    url: "https://react-native-tdlib.js.org/",
    ...(release ? { version: release.version } : {}),
    keywords: [
      "react-native",
      "telegram",
      "tdlib",
      "telegram-client",
      "ios",
      "android",
      "typescript",
    ],
    author: {
      "@type": "Person",
      name: "Vladlen Kaveev",
      url: "https://github.com/vladlenskiy",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(software) }}
    />
  );
}
