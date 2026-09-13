import { createBrowserClient } from "@supabase/ssr";

// Supabase client for Client Components. The anon key is safe in the browser —
// row level security (see schema.sql) is what actually guards the tables.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
