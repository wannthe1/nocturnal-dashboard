import { ImageResponse } from "next/og";
import { BrandIcon } from "@/lib/brand-mark";

// The icon used when someone adds the app to their phone's home screen.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(<BrandIcon size={180} radius={0} />, size);
}
