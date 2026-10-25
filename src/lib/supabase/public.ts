import { createClient } from "@supabase/supabase-js";

// Supabase client for public reads that don't need a session. Unlike
// server.ts it never touches cookies(), so a page that only uses this one can
// be cached and served from the CDN (the homepage). Admin writes call
// revalidatePath, which refreshes those cached pages.
export function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
}
