"use server";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/catalog";

export type RequestItem = {
  productId: string | null;
  colorId: string | null;
  customText: string | null;
  linePrice: number | null;
};

export type RequestPayload = {
  customerName: string;
  phone: string;
  city: string;
  eventDate: string; // yyyy-mm-dd
  eventTime: string; // hh:mm, may be empty
  setup2hBefore: boolean;
  estimatedTotal: number;
  items: RequestItem[];
};

export type RequestResult = { ok: true } | { ok: false; error: string };

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

  if (!payload.phone.trim() || !payload.eventDate) {
    return { ok: false, error: "Моля, попълнете телефон и дата на събитието." };
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
    type: "service",
    status: "requested",
    event_date: payload.eventDate,
    event_time: payload.eventTime || null,
    city: payload.city.trim() || null,
    setup_2h_before: payload.setup2hBefore,
    customer_name: payload.customerName.trim() || null,
    phone: payload.phone.trim(),
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
      custom_text: item.customText,
      qty: 1,
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
