import { ImageResponse } from "next/og";

export const dynamic = "force-static";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#09090b",
          position: "relative",
        }}
      >
        <svg
          width={160}
          height={160}
          viewBox="0 0 64 64"
          style={{ position: "absolute", inset: 10 }}
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
            marginTop: 8,
            fontSize: 44,
            fontWeight: 800,
            color: "#ffffff",
            letterSpacing: -1,
          }}
        >
          TD
        </div>
      </div>
    ),
    size,
  );
}
