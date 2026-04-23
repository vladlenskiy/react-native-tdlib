import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const title = "react-native-tdlib — Telegram client for React Native";
const description =
  "Official TDLib under the hood, prebuilt binaries, one API on iOS and Android. Build a real Telegram client in React Native.";

export const metadata: Metadata = {
  metadataBase: new URL("https://vladlenskiy.github.io/react-native-tdlib/"),
  title,
  description,
  openGraph: {
    title,
    description,
    type: "website",
    url: "https://vladlenskiy.github.io/react-native-tdlib/",
    siteName: "react-native-tdlib",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    creator: "@vladlensk1y",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
