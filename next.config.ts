import type { NextConfig } from "next";

// Basic security headers sent with every page.
const securityHeaders = [
  // Don't let other sites show the app inside a frame (stops "clickjacking").
  { key: "X-Frame-Options", value: "DENY" },
  // Browsers must use the file types the server says, not guess.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Only send the site's address (not full page paths) to other sites.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The app doesn't need the camera, microphone or location.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Browser source maps stay off in production builds (Next.js default), so the
  // original source code isn't published.
  productionBrowserSourceMaps: false,
  poweredByHeader: false, // don't advertise "X-Powered-By: Next.js"
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
