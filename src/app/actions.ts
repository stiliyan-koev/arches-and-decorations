"use server";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/catalog";

export type RequestItem = {
  productId: string;
  colorId: string | null;
  qty: number;
  linePrice: number | null;
  customText: string | null; // what the customer described, e.g. the balloon theme
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

// Limits for what one request may carry. The forms stay well inside them, but
// submitRequest is a public endpoint that anyone can
// call with a hand-built payload, so the limits are checked here.
const MAX_ITEMS = 30;
const MAX_QTY = 20; // booking_items.qty feeds reserved_qty() once confirmed. = MAX_PER_LINE in catalog-plp.ts
const MAX_SHORT_TEXT = 200; // name, phone, city
const MAX_NOTE = 3000; // same as the note textarea's maxLength
const MAX_CUSTOM_TEXT = 1000; // same as the modal's text box maxLength

const SEND_FAILED = "Нещо се обърка при изпращането. Моля, опитайте отново.";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function isTextUpTo(value: unknown, maxLength: number) {
  return typeof value === "string" && value.length <= maxLength;
}

// The longest date range the availability reads accept — a long rental, with
// room to spare. These are public endpoints, so a hand-built call can't read
// totals across years; anything else reads as "nothing booked".
const MAX_RANGE_DAYS = 62;
const DAY_MS = 24 * 60 * 60 * 1000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Two yyyy-mm-dd dates, in order, at most MAX_RANGE_DAYS apart.
function isDateRange(from: unknown, to: unknown) {
  if (typeof from !== "string" || typeof to !== "string") return false;
  if (!ISO_DATE.test(from) || !ISO_DATE.test(to) || from > to) return false;
  const days = (Date.parse(to) - Date.parse(from)) / DAY_MS;
  return Number.isFinite(days) && days <= MAX_RANGE_DAYS;
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

// How many of each product confirmed bookings already hold between two dates.
// Anything that goes wrong returns {} — "assume nothing is booked", which
// matches how the site behaves before the database exists. She confirms every
// request by hand anyway, so a stale read here annoys a customer at worst; it
// can't double-book her.
async function reservedByProduct(supabase: Supabase, from: string, to: string) {
  const reserved: Record<string, number> = {};
  const { data, error } = await supabase.rpc("reserved_qty_all", {
    p_from: from,
    p_to: to,
  });
  if (error || !data) return reserved;
  for (const row of data as { product_id: string; reserved: number }[]) {
    reserved[row.product_id] = row.reserved;
  }
  return reserved;
}

// The same per colour, for products with colours: each colour has its own
// stock (product_colors.quantity). Same fallback.
async function reservedByColor(supabase: Supabase, from: string, to: string) {
  const reserved: Record<string, number> = {};
  const { data, error } = await supabase.rpc("reserved_qty_by_color", {
    p_from: from,
    p_to: to,
  });
  if (error || !data) return reserved;
  for (const row of data as { color_id: string; reserved: number }[]) {
    reserved[row.color_id] = row.reserved;
  }
  return reserved;
}

// Per product, for the configurator: it subtracts this from products.quantity
// to decide what a tile can still offer.
export async function getReservedQuantities(
  from: string,
  to: string,
): Promise<Record<string, number>> {
  if (!isSupabaseConfigured() || !isDateRange(from, to)) return {};
  const supabase = await createClient();
  return reservedByProduct(supabase, from, to);
}

// Per product and per colour, for the request page's over-stock warnings. One
// action for both: a page's Server Actions are sent one at a time, so two
// actions would be two round trips. Here the two reads run side by side.
export async function getRequestAvailability(
  from: string,
  to: string,
): Promise<{ byProduct: Record<string, number>; byColor: Record<string, number> }> {
  if (!isSupabaseConfigured() || !isDateRange(from, to)) {
    return { byProduct: {}, byColor: {} };
  }
  const supabase = await createClient();
  const [byProduct, byColor] = await Promise.all([
    reservedByProduct(supabase, from, to),
    reservedByColor(supabase, from, to),
  ]);
  return { byProduct, byColor };
}

export async function submitRequest(
  payload: RequestPayload,
): Promise<RequestResult> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      error:
        "Връзката с базата данни още не е настроена. Моля, пишете ни във Facebook или TikTok.",
    };
  }

  // The form can never fail these checks, so failing one means a hand-built
  // call and the generic message is enough.
  if (payload.mode !== "service" && payload.mode !== "rental") {
    return { ok: false, error: SEND_FAILED };
  }

  if (
    !isTextUpTo(payload.customerName, MAX_SHORT_TEXT) ||
    !isTextUpTo(payload.phone, MAX_SHORT_TEXT) ||
    !isTextUpTo(payload.city, MAX_SHORT_TEXT) ||
    !isTextUpTo(payload.note, MAX_NOTE)
  ) {
    return { ok: false, error: SEND_FAILED };
  }

  if (!Array.isArray(payload.items) || payload.items.length > MAX_ITEMS) {
    return { ok: false, error: SEND_FAILED };
  }

  for (const item of payload.items) {
    const qty = item?.qty;
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) {
      return { ok: false, error: SEND_FAILED };
    }
    // A colour is a product_colors id, or nothing. Missing counts as nothing.
    if (item.colorId != null && !(typeof item.colorId === "string" && UUID.test(item.colorId))) {
      return { ok: false, error: SEND_FAILED };
    }
    // Missing (undefined) counts as "no text", same as null.
    if (
      item.customText != null &&
      !isTextUpTo(item.customText, MAX_CUSTOM_TEXT)
    ) {
      return { ok: false, error: SEND_FAILED };
    }
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

  // A colour has to be one of its own product's colours. Otherwise a hand-built
  // call could file a product in another product's colour — and once she
  // confirms it, take stock off the wrong colour.
  const colorIds = [
    ...new Set(
      payload.items
        .map((item) => item.colorId)
        .filter((id): id is string => id != null),
    ),
  ];
  if (colorIds.length > 0) {
    const { data: colors, error: colorsError } = await supabase
      .from("product_colors")
      .select("id, product_id")
      .in("id", colorIds);
    if (colorsError || !colors) return { ok: false, error: SEND_FAILED };

    const productOf = new Map(colors.map((color) => [color.id, color.product_id]));
    const mismatch = payload.items.some(
      (item) => item.colorId != null && productOf.get(item.colorId) !== item.productId,
    );
    if (mismatch) return { ok: false, error: SEND_FAILED };
  }

  // We generate the id ourselves instead of reading it back: row level security
  // lets the public INSERT a booking but never SELECT one, so .select() after
  // an insert would be rejected.
  const bookingId = crypto.randomUUID();

  // Only an estimate for the admin to read; anything that isn't a sane number
  // is stored as "unknown" rather than as-is.
  const estimatedTotal =
    Number.isFinite(payload.estimatedTotal) && payload.estimatedTotal >= 0
      ? payload.estimatedTotal
      : null;

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
    estimated_total: estimatedTotal,
  });

  if (bookingError) {
    return { ok: false, error: SEND_FAILED };
  }

  const { error: itemsError } = await supabase.from("booking_items").insert(
    payload.items.map((item) => ({
      booking_id: bookingId,
      product_id: item.productId,
      color_id: item.colorId ?? null,
      custom_text: item.customText?.trim() || null,
      qty: item.qty,
      line_price: item.linePrice,
    })),
  );

  if (itemsError) {
    return {
      ok: false,
      error: "Заявката е приета частично. Моля, пишете ни във Facebook или TikTok, за да я потвърдим.",
    };
  }

  return { ok: true };
}
