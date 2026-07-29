import { ImageResponse } from "next/og";

// Generated at build time by next/og — no external image service, nothing to hotlink,
// and no third-party request when a link is unfurled (Pipeline-Images: everything
// self-hosted, for performance and NDA safety alike).
export const dynamic = "force-static";

export const alt =
  "Product design for enterprise operations — Enterprise B2B, manufacturing operations, and financial systems.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          // Literal colors: this renders in an isolated Satori runtime with no access to
          // the stylesheet, so the design tokens cannot be referenced here. Values are
          // copied from globals.css --bg-app / --text-main / --accent-brand and must be
          // updated alongside them.
          backgroundColor: "#f8f9fb",
          color: "#0f172a",
        }}
      >
        <div style={{ display: "flex", fontSize: 64, lineHeight: 1.1 }}>
          Product design for
          <br />
          enterprise operations
        </div>
        <div style={{ display: "flex", marginTop: 32, fontSize: 28, color: "#5b6472" }}>
          Enterprise B2B · Manufacturing Operations · Financial Systems
        </div>
        <div
          style={{ display: "flex", marginTop: 48, height: 8, width: 180, backgroundColor: "#4f46e5" }}
        />
      </div>
    ),
    size,
  );
}
