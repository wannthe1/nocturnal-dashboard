// The Nocturnal Tech logo with plain styles, for generated images (the favicon,
// home-screen icon and social share card), where Tailwind isn't available.
export const BRAND = {
  obsidian: "#050505",
  midnight: "#161618",
  silver: "#C8C8CC",
  moon: "#F5F5F7",
};

const CRESCENT = "M50 21.6A44.6 44.6 0 1 0 82.5 96.7A41.74 41.74 0 1 1 50 21.6Z";
const STAR = "M50 42Q51.3 57.7 61 59Q51.3 60.3 50 76Q48.7 60.3 39 59Q48.7 57.7 50 42Z";

// The bare mark. The vertical line is thickened so it survives at small sizes.
export function BrandGlyph({ size, lineWidth = 2 }: { size: number; lineWidth?: number }) {
  const w = lineWidth / 2;
  return (
    <svg width={(size * 100) / 112} height={size} viewBox="0 0 100 112" fill={BRAND.moon}>
      <path d={CRESCENT} />
      <path d={`M50 0L${50 + w} 59L50 110L${50 - w} 59Z`} />
      <path d={STAR} />
    </svg>
  );
}

// The app icon: the logo on an Obsidian tile.
export function BrandIcon({ size, radius }: { size: number; radius: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: BRAND.obsidian,
        borderRadius: radius,
      }}
    >
      <BrandGlyph size={size * 0.84} lineWidth={3} />
    </div>
  );
}
