import type { Metadata, Viewport } from "next";
import { Manrope, Noto_Sans_Myanmar, Noto_Sans_Thai } from "next/font/google";
import { LOCALE_COOKIE, SIDEBAR_KEY, THEME_KEY } from "@/lib/i18n/config";
import "./globals.css";

// Greek is included for the "Λ" in the NOCTURNΛL wordmark.
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin", "greek"] });
// Only downloaded by the browser when Thai or Burmese text is on screen.
const notoThai = Noto_Sans_Thai({ variable: "--font-noto-thai", subsets: ["thai"], preload: false });
const notoMyanmar = Noto_Sans_Myanmar({
  variable: "--font-noto-myanmar",
  subsets: ["myanmar"],
  weight: ["400", "500", "600", "700"],
  preload: false,
});

export const metadata: Metadata = {
  // The site's public address, used to build full links for share images and
  // canonical tags. Set NEXT_PUBLIC_SITE_URL to your domain when you host the app.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    template: "%s · Nocturnal Tech",
    default: "Nocturnal Tech",
  },
  description: "Restaurant management and business intelligence by Nocturnal Tech.",
  applicationName: "Nocturnal Tech",
  openGraph: { siteName: "Nocturnal Tech", type: "website" },
};

export const viewport: Viewport = {
  themeColor: "#050505",
  colorScheme: "dark light",
};

// Runs before the first paint, so the saved theme, language and sidebar apply with no flash.
const beforePaint = `try{var d=document.documentElement;d.dataset.theme=localStorage.getItem(${JSON.stringify(THEME_KEY)})==="light"?"light":"dark";if(localStorage.getItem(${JSON.stringify(SIDEBAR_KEY)})==="collapsed")d.dataset.sidebar="collapsed";var m=document.cookie.match(/(?:^|; )${LOCALE_COOKIE}=([a-z]+)/);if(m)d.lang=m[1]}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: the script above changes these attributes on purpose.
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${manrope.variable} ${notoThai.variable} ${notoMyanmar.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: beforePaint }} />
      </head>
      <body className="min-h-full font-sans text-ink">{children}</body>
    </html>
  );
}
