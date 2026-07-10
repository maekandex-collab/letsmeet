import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import { join } from "path";

export const alt = "LetsMeet — Match, Chat, Love";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const logoBuffer = await readFile(
    join(process.cwd(), "public", "letsmeet-logo.png")
  );
  const logoSrc = `data:image/png;base64,${logoBuffer.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(160deg, #2a0b3f 0%, #4a1063 38%, #7d1480 70%, #b5179e 100%)",
          color: "white",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <img src={logoSrc} width={220} height={220} alt="" />
        <div
          style={{
            marginTop: 36,
            fontSize: 72,
            fontWeight: 800,
            letterSpacing: "-0.02em",
          }}
        >
          LetsMeet
        </div>
        <div
          style={{
            marginTop: 16,
            fontSize: 28,
            fontWeight: 600,
            letterSpacing: "0.25em",
            opacity: 0.85,
            textTransform: "uppercase",
          }}
        >
          Match · Chat · Love
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 22,
            opacity: 0.7,
            maxWidth: 640,
            textAlign: "center",
            lineHeight: 1.4,
          }}
        >
          Meet genuine people near you and start something real today.
        </div>
      </div>
    ),
    { ...size }
  );
}
