import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/catalog";

// „Труд за украса“ while the settings table doesn't exist yet
// (migration-labour.sql) or can't be read. She sets the real one in admin, at
// the top of „Каталог“.
export const LABOUR_PRICE_DEFAULT = 50;

// The labour price, in EUR, added once to a basket she sets up. 0 = none.
export async function getLabourPrice(): Promise<number> {
  if (!isSupabaseConfigured()) return LABOUR_PRICE_DEFAULT;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("settings")
    .select("labour_price")
    .eq("id", 1)
    .maybeSingle();
  if (error || !data) {
    if (error) console.error("getLabourPrice: using the default", error);
    return LABOUR_PRICE_DEFAULT;
  }
  return Number(data.labour_price);
}
