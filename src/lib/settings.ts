import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/catalog";

// „Труд за украса“ while the settings table doesn't exist yet
// (migration-labour.sql) or can't be read. She sets the real one in admin, at
// the top of „Каталог“.
export const LABOUR_PRICE_DEFAULT = 50;

// The labour price, in EUR, added once to a basket she sets up. 0 = none.
export async function getLabourPrice(): Promise<number> {
  if (!isSupabaseConfigured()) return LABOUR_PRICE_DEFAULT;

  try {
    const price = await readLabourPrice();
    if (price !== null) return price;
  } catch (error) {
    console.error("getLabourPrice: using the default", error);
  }
  return LABOUR_PRICE_DEFAULT;
}

// Cached like the catalog (see readCatalog in catalog.ts): 5 minutes, cleared
// by every admin write through the same "catalog" tag. Throws on a database
// error, so the default is never cached; null = the row isn't there.
const readLabourPrice = unstable_cache(async (): Promise<number | null> => {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("settings")
    .select("labour_price")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw error;
  return data ? Number(data.labour_price) : null;
}, ["labour-price"], { revalidate: 300, tags: ["catalog"] });

// Whether the site offers „Под наем“ at all. She switches it at the top of
// „Каталог“ in admin. On while the column doesn't exist yet
// (migration-rent-toggle.sql) or can't be read, which is how the site has
// always worked.
export async function getRentEnabled(): Promise<boolean> {
  if (!isSupabaseConfigured()) return true;

  try {
    const enabled = await readRentEnabled();
    if (enabled !== null) return enabled;
  } catch (error) {
    console.error("getRentEnabled: leaving it on", error);
  }
  return true;
}

// Cached the same way as the labour price. Its own query, so the labour price
// keeps working on a database that hasn't had the migration yet.
const readRentEnabled = unstable_cache(async (): Promise<boolean | null> => {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("settings")
    .select("rent_enabled")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw error;
  return data ? data.rent_enabled : null;
}, ["rent-enabled"], { revalidate: 300, tags: ["catalog"] });
