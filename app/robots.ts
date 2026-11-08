import type { MetadataRoute } from "next";

// Tells search engines what they may list. The dashboard is private, so only the
// sign-in and privacy pages are open to them.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: ["/login", "/privacy"], disallow: "/" },
  };
}
