import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  const fontData = await fetch(
    "https://github.com/JetBrains/JetBrainsMono/raw/master/fonts/ttf/JetBrainsMono-ExtraBold.ttf",
  ).then((r) => r.arrayBuffer());

  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          background: "#09090b",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            color: "white",
            fontSize: 62,
            fontWeight: 800,
            letterSpacing: 6,
            fontFamily: "JetBrains Mono",
          }}
        >
          Av
        </span>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "JetBrains Mono", data: fontData, weight: 800 }],
    },
  );
}
