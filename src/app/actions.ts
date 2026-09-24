"use server";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/catalog";

export type RequestItem = {
  productId: string;
  colorId: string | null;
  qty: number;
  linePrice: number | null;
};

export type RequestPayload = {
  mode: "service" | "rental";
  customerName: string;
  phone: string;
  city: string;
  note: string;
  eventDate: string; // yyyy-mm-dd — service mode
  eventTime: string; // hh:mm, may be empty
  startDate: string; // yyyy-mm-dd — rental pickup
  endDate: string; // yyyy-mm-dd — rental return
  setup2hBefore: boolean;
  estimatedTotal: number;
  items: RequestItem[];
};

export type RequestResult = { ok: true } | { ok: false; error: string };

// How many of each product are already spoken for between two dates. The
// configurator subtracts this from products.quantity to decide what a tile can
// still offer. Anything that goes wrong returns {} — an empty map means "assume
// nothing is booked", which matches how the site behaves before the database
// exists. She confirms every request by hand anyway, so a stale read here
// annoys a customer at worst; it can't double-book her.
export async function getReservedQuantities(
  from: string,
  to: string,
): Promise<Record<string, number>> {
  if (!isSupabaseConfigured() || !from || !to) return {};

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("reserved_qty_all", {
    p_from: from,
    p_to: to,
  });

  if (error || !data) return {};

  const reserved: Record<string, number> = {};
  for (const row of data as { product_id: string; reserved: number }[]) {
    reserved[row.product_id] = row.reserved;
  }
  return reserved;
}

export async function submitRequest(
  payload: RequestPayload,
): Promise<RequestResult> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      error:
        "Връзката с базата данни още не е настроена. Моля, обадете се по телефона.",
    };
  }

  const isRental = payload.mode === "rental";

  if (!payload.phone.trim()) {
    return { ok: false, error: "Моля, попълнете телефон." };
  }

  if (isRental ? !payload.startDate || !payload.endDate : !payload.eventDate) {
    return { ok: false, error: "Моля, изберете дата." };
  }

  if (payload.items.length === 0) {
    return { ok: false, error: "Моля, изберете поне един артикул." };
  }

  const supabase = await createClient();

  // We generate the id ourselves instead of reading it back: row level security
  // lets the public INSERT a booking but never SELECT one, so .select() after
  // an insert would be rejected.
  const bookingId = crypto.randomUUID();

  const { error: bookingError } = await supabase.from("bookings").insert({
    id: bookingId,
    type: payload.mode,
    status: "requested",
    // A service booking occupies the single event day; a rental occupies the
    // pickup→return range. reserved_qty() reads exactly these columns.
    event_date: isRental ? null : payload.eventDate,
    event_time: isRental ? null : payload.eventTime || null,
    start_date: isRental ? payload.startDate : null,
    end_date: isRental ? payload.endDate : null,
    city: payload.city.trim() || null,
    setup_2h_before: isRental ? null : payload.setup2hBefore,
    customer_name: payload.customerName.trim() || null,
    phone: payload.phone.trim(),
    note: payload.note.trim() || null,
    estimated_total: payload.estimatedTotal,
  });

  if (bookingError) {
    return {
      ok: false,
      error: "Нещо се обърка при изпращането. Моля, опитайте отново.",
    };
  }

  const { error: itemsError } = await supabase.from("booking_items").insert(
    payload.items.map((item) => ({
      booking_id: bookingId,
      product_id: item.productId,
      color_id: item.colorId,
      qty: item.qty,
      line_price: item.linePrice,
    })),
  );

  if (itemsError) {
    return {
      ok: false,
      error: "Заявката е приета частично. Моля, обадете се, за да я потвърдим.",
    };
  }

  return { ok: true };
}
