import { networkInterfaces } from "node:os";
import type { NextConfig } from "next";

// next/image refuses remote hosts it wasn't told about. Product photos come
// from the Supabase Storage bucket, so derive that host from the env var rather
// than hardcoding the project ref. Missing env = no remote images, same as the
// rest of the app falling back to placeholders.
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : null;

// Allow the dev server to be opened from other devices on the LAN (phones for
// responsive testing, etc.). Without this Next 16 blocks the dev websocket for
// requests to the machine's network IP, the page never hydrates and nothing
// interactive works. So allow this machine's own IPv4 addresses, plus any extra
// hosts in DEV_ALLOWED_ORIGINS (comma-separated). Dev-only; ignored by builds.
const lanAddresses = Object.values(networkInterfaces())
  .flat()
  .filter((net) => net?.family === "IPv4" && !net.internal)
  .map((net) => net!.address);
const devAllowedOrigins = [
  ...lanAddresses,
  ...(process.env.DEV_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin !== ""),
];

const nextConfig: NextConfig = {
  allowedDevOrigins: devAllowedOrigins,
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
