import type { MetadataRoute } from "next";
import { getLatestRelease } from "@/lib/release";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const release = getLatestRelease();
  const lastModified = release ? new Date(`${release.date}T00:00:00Z`) : new Date();

  return [
    {
      url: "https://vladlenskiy.github.io/react-native-tdlib/",
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
