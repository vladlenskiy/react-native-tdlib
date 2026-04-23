import { ImageResponse } from "next/og";
import { getRepoStats, formatStars } from "@/lib/github";

export const dynamic = "force-static";
export const alt =
  "react-native-tdlib — Build a real Telegram client in React Native.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function Logo() {
  return (
    <div
      style={{
        position: "relative",
        width: 96,
        height: 96,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg
        width={96}
        height={96}
        viewBox="0 0 64 64"
        style={{ position: "absolute", inset: 0 }}
      >
        <g
          fill="none"
          stroke="#ffffff"
          strokeWidth={1.8}
          strokeLinecap="round"
          opacity={0.72}
        >
          <ellipse cx={32} cy={32} rx={26} ry={10} />
          <ellipse
            cx={32}
            cy={32}
            rx={26}
            ry={10}
            transform="rotate(60 32 32)"
          />
          <ellipse
            cx={32}
            cy={32}
            rx={26}
            ry={10}
            transform="rotate(120 32 32)"
          />
        </g>
        <path
          d="M32 13 L47 18 L47 33 C47 41.5 40.5 47.5 32 51 C23.5 47.5 17 41.5 17 33 L17 18 Z"
          fill="#229ED9"
        />
      </svg>
      <div
        style={{
          display: "flex",
          position: "relative",
          marginTop: 4,
          fontSize: 22,
          fontWeight: 800,
          color: "#ffffff",
          letterSpacing: -0.5,
        }}
      >
        TD
      </div>
    </div>
  );
}

export default async function OG() {
  const { stars } = await getRepoStats();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          background:
            "radial-gradient(80% 60% at 50% 0%, rgba(34,158,217,0.35), transparent 70%), #09090b",
          color: "#fafafa",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <Logo />
          <div
            style={{
              fontSize: 36,
              fontWeight: 600,
              letterSpacing: -0.5,
              color: "#fafafa",
            }}
          >
            react-native-tdlib
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              fontSize: 76,
              fontWeight: 600,
              lineHeight: 1.05,
              letterSpacing: -2,
              color: "#fafafa",
              display: "flex",
              flexWrap: "wrap",
            }}
          >
            Build a real Telegram client in&nbsp;
            <span style={{ color: "#229ED9" }}>React Native.</span>
          </div>
          <div
            style={{
              fontSize: 28,
              color: "#a1a1aa",
              lineHeight: 1.35,
              maxWidth: 980,
            }}
          >
            Official TDLib. Prebuilt binaries. 51 typed methods. iOS + Android
            parity. No cmake.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 22,
            color: "#a1a1aa",
          }}
        >
          <div style={{ display: "flex", gap: 24 }}>
            <span>MIT</span>
            <span>·</span>
            <span>v2.2.1</span>
            <span>·</span>
            <span>npm i react-native-tdlib</span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 20px",
              border: "1px solid rgba(255,255,255,0.14)",
              borderRadius: 12,
              color: "#fafafa",
              fontWeight: 600,
            }}
          >
            {formatStars(stars)} stars
          </div>
        </div>
      </div>
    ),
    size,
  );
}
