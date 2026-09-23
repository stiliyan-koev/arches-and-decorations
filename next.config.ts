import type { NextConfig } from "next";

// next/image refuses remote hosts it wasn't told about. Product photos come
// from the Supabase Storage bucket, so derive that host from the env var rather
// than hardcoding the project ref. Missing env = no remote images, same as the
// rest of the app falling back to placeholders.
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : null;

const nextConfig: NextConfig = {
  // Allow the dev server to be opened from other devices on the LAN (phones for
  // responsive testing, etc.). Without this Next 16 flags requests coming from
  // the machine's network IP as cross-origin. Update the IP if DHCP reassigns it.
  allowedDevOrigins: ["192.168.0.179"],
  images: {
    remotePatterns: supabaseHost
      ? [
          {
            protocol: "https",
            hostname: supabaseHost,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
};

export default nextConfig;
