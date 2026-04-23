import * as React from "react";

export function Logo({
  className,
  ...props
}: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity="0.75"
      >
        <ellipse cx="32" cy="32" rx="26" ry="10" />
        <ellipse
          cx="32"
          cy="32"
          rx="26"
          ry="10"
          transform="rotate(60 32 32)"
        />
        <ellipse
          cx="32"
          cy="32"
          rx="26"
          ry="10"
          transform="rotate(120 32 32)"
        />
      </g>
      <path
        d="M32 13 L47 18 L47 33 C47 41.5 40.5 47.5 32 51 C23.5 47.5 17 41.5 17 33 L17 18 Z"
        fill="#229ED9"
      />
      <text
        x="32"
        y="37.5"
        textAnchor="middle"
        fontFamily="ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
        fontWeight="800"
        fontSize="14"
        fill="#ffffff"
        letterSpacing="-0.5"
      >
        TD
      </text>
    </svg>
  );
}

export function GithubIcon({
  className,
  ...props
}: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <path d="M12 .5C5.73.5.75 5.48.75 11.75c0 4.97 3.22 9.17 7.7 10.66.56.1.77-.24.77-.54 0-.27-.01-1.17-.02-2.12-3.13.68-3.79-1.34-3.79-1.34-.51-1.3-1.25-1.65-1.25-1.65-1.02-.7.08-.69.08-.69 1.13.08 1.72 1.16 1.72 1.16 1 1.72 2.63 1.22 3.27.93.1-.73.39-1.23.71-1.51-2.5-.28-5.13-1.25-5.13-5.55 0-1.23.44-2.23 1.16-3.02-.12-.28-.5-1.42.11-2.96 0 0 .95-.3 3.1 1.15a10.77 10.77 0 0 1 5.64 0c2.15-1.45 3.1-1.15 3.1-1.15.61 1.54.23 2.68.11 2.96.72.79 1.16 1.79 1.16 3.02 0 4.31-2.63 5.27-5.14 5.55.4.35.76 1.03.76 2.08 0 1.5-.01 2.71-.01 3.08 0 .3.2.65.78.54a11.25 11.25 0 0 0 7.69-10.66C23.25 5.48 18.27.5 12 .5Z" />
    </svg>
  );
}

export function XIcon({
  className,
  ...props
}: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <path d="M18.244 2H21.5l-7.54 8.617L22.5 22h-6.828l-5.356-6.99L4.1 22H.84l8.08-9.234L1.5 2h6.914l4.83 6.39L18.244 2Zm-2.39 18h1.76L7.24 4H5.36l10.494 16Z" />
    </svg>
  );
}
