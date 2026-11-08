import { ImageResponse } from "next/og";
import { BRAND, BrandGlyph } from "@/lib/brand-mark";

// The preview card shown when a link to the app is shared (WhatsApp, Slack, LinkedIn…).
export const alt = "Nocturnal Tech: restaurant management and business intelligence";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: 90,
          background: `radial-gradient(800px 500px at 85% 40%, #2a2a2d, ${BRAND.obsidian})`,
          color: BRAND.moon,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 40, letterSpacing: 16 }}>NOCTURNAL TECH</div>
          <div style={{ marginTop: 56, fontSize: 68, fontWeight: 600, lineHeight: 1.12 }}>Sales, stock and spending.</div>
          <div style={{ fontSize: 68, fontWeight: 600, lineHeight: 1.12, color: BRAND.silver }}>One clear view.</div>
        </div>
        <BrandGlyph size={380} lineWidth={1.6} />
      </div>
    ),
    size,
  );
}
