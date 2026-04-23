import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { JsonLd } from "@/components/json-ld";

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
  "React Native bindings for Telegram's TDLib. Prebuilt iOS and Android binaries, a single typed API for chats, messages, reactions, files, and real-time updates.";

export const metadata: Metadata = {
  metadataBase: new URL("https://react-native-tdlib.js.org/"),
  title: {
    default: title,
    template: "%s · react-native-tdlib",
  },
  description,
  applicationName: "react-native-tdlib",
  authors: [{ name: "Vladlen Kaveev", url: "https://github.com/vladlenskiy" }],
  creator: "Vladlen Kaveev",
  publisher: "Vladlen Kaveev",
  keywords: [
    "react-native",
    "react native telegram",
    "telegram client react native",
    "tdlib",
    "tdlib react native",
    "telegram api",
    "telegram sdk",
    "ios",
    "android",
    "typescript",
    "telegram client",
    "prebuilt tdlib binaries",
  ],
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/apple-icon",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    title,
    description,
    type: "website",
    url: "https://react-native-tdlib.js.org/",
    siteName: "react-native-tdlib",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    creator: "@vladlensk1y",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
  colorScheme: "light dark",
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
      <head>
        <JsonLd />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
