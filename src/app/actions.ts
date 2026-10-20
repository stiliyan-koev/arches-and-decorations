"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/catalog";
import { sendOwnerEmail } from "@/lib/mail";
import { formatDate, formatPrice, formatTotal, QUOTE_LABEL } from "@/lib/format";

export type RequestItem = {
  productId: string;
  colorId: string | null;
  qty: number;
  linePrice: number | null;
  customText: string | null; // what the customer described: the balloon theme, or a product's „Опишете вашите изисквания“
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
  estimatedTotal: number; // with labourPrice in it
  // „Труд за украса“ as the customer saw it in the sum; null = none (rental, or
  // the configurator, which doesn't add it).
  labourPrice?: number | null;
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
const MAX_CUSTOM_TEXT = 1000; // same as the modal's text box maxLength and REQUIREMENTS_MAX in selection.ts

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
    // A product's id. A slug instead means the catalog fell back to
    // FALLBACK_GROUPS, and the booking row would be written before the items
    // insert died on the uuid column.
    if (typeof item.productId !== "string" || !UUID.test(item.productId)) {
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

  // She hears about every request by email. The booking is saved by now, so
  // the email goes out after the response (after(); Netlify keeps the function
  // running for it): the customer's button doesn't wait on Resend, and a slow
  // or failed email can't turn a saved request into an error. The log says
  // which booking she wasn't told about. Throttled like the contact form, with
  // its own caps (requestSends), so spam there can't stop these emails.
  const ip = await callerIp();
  after(async () => {
    let emailed = false;
    if (allowSend(requestSends, ip)) {
      emailed = await sendOwnerEmail(
        requestEmailSubject(payload, estimatedTotal),
        await requestEmailText(supabase, payload, estimatedTotal),
      );
    }
    if (!emailed) {
      console.error("Request saved, but the owner wasn't emailed:", bookingId);
    }
  });

  return { ok: true };
}

// „Мария Иванова — 14.11.2026 — 250,00 €“: who, when and how much, so the
// inbox list alone says what a request is worth. Whitespace collapsed on the
// whole line: it goes into a mail header, and a newline in a header would
// split it. The name is free text, and Postgres accepts a date with a newline
// around it.
function requestEmailSubject(payload: RequestPayload, estimatedTotal: number | null) {
  const who = payload.customerName.trim() || payload.phone.trim();
  const date = payload.mode === "rental" ? payload.startDate : payload.eventDate;
  // The same number as the body's last line, „по запитване“ items and all.
  const hasQuote = payload.items.some(
    (item) => typeof item.linePrice !== "number" || !Number.isFinite(item.linePrice),
  );
  const price =
    estimatedTotal === null ? "(неизвестна)" : formatTotal(estimatedTotal, hasQuote);
  return `${who} — ${formatDate(date)} — ${price}`.replace(/\s+/g, " ").trim();
}

// The request as she'd read it on the form: product and colour names, not ids.
// A name that can't be read (a product hidden since, a database hiccup) shows
// as „(артикулът не е намерен)“ — the email still goes.
async function requestEmailText(
  supabase: Supabase,
  payload: RequestPayload,
  estimatedTotal: number | null,
) {
  const productIds = [...new Set(payload.items.map((item) => item.productId))];
  const { data } = await supabase
    .from("products")
    .select("id, name, product_colors(id, color_name)")
    .in("id", productIds);

  const productNames = new Map<string, string>();
  const colorNames = new Map<string, string>();
  for (const product of (data ?? []) as {
    id: string;
    name: string;
    product_colors: { id: string; color_name: string }[];
  }[]) {
    productNames.set(product.id, product.name);
    for (const color of product.product_colors) colorNames.set(color.id, color.color_name);
  }

  const isRental = payload.mode === "rental";
  const lines = [
    `Вид: ${isRental ? "Под наем" : "Украса с монтаж от нас"}`,
  ];
  if (isRental) {
    lines.push(`Вземане: ${formatDate(payload.startDate)}`);
    lines.push(`Връщане: ${formatDate(payload.endDate)}`);
  } else {
    const time = payload.eventTime ? `, ${payload.eventTime}` : "";
    lines.push(`Дата: ${formatDate(payload.eventDate)}${time}`);
    lines.push(`Монтаж 2 часа преди събитието: ${payload.setup2hBefore ? "да" : "не"}`);
  }
  lines.push(`Град: ${payload.city.trim() || "(не е посочен)"}`);
  lines.push("");
  lines.push(`Име: ${payload.customerName.trim() || "(не е посочено)"}`);
  lines.push(`Телефон: ${payload.phone.trim()}`);
  lines.push("");
  lines.push("Артикули:");

  let hasQuote = false;
  for (const item of payload.items) {
    const name = productNames.get(item.productId) ?? "(артикулът не е намерен)";
    const color = item.colorId ? colorNames.get(item.colorId) : undefined;
    // linePrice comes from the browser, so only a real number is printed;
    // anything else is a „по запитване“ line.
    const linePrice = item.linePrice;
    const priced = typeof linePrice === "number" && Number.isFinite(linePrice);
    if (!priced) hasQuote = true;
    const price = priced ? formatPrice(linePrice) : QUOTE_LABEL;

    lines.push(`• ${[name, color].filter(Boolean).join(", ")} — ${item.qty} бр. — ${price}`);
    const requirements = item.customText?.trim();
    if (requirements) lines.push(`  Изисквания: ${requirements}`);
  }

  // From the browser too, like linePrice: only a real number is printed.
  const labour = payload.labourPrice;
  if (typeof labour === "number" && Number.isFinite(labour) && labour > 0) {
    lines.push(`• Труд за украса — ${formatPrice(labour)}`);
  }

  // formatTotal, like the site: an all-„по запитване“ basket sums to 0, and
  // „0,00 €“ would read as free. That case already says „По запитване“, so
  // the reminder line is only for a real number.
  lines.push("");
  lines.push(
    `Ориентировъчна сума: ${estimatedTotal === null ? "(неизвестна)" : formatTotal(estimatedTotal, hasQuote)}`,
  );
  if (hasQuote && estimatedTotal !== 0) {
    lines.push("Артикулите „по запитване“ не са включени в сумата.");
  }

  const note = payload.note.trim();
  if (note) {
    lines.push("");
    lines.push("Бележка:");
    lines.push(note);
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// The contact form on /about. No database: the message is an email to the
// owner and nothing else, so if the email doesn't go out the customer is told
// to use Messenger, Viber or the phone — all three are next to the form.

export type ContactPayload = {
  name: string;
  phone: string;
  email: string; // optional — only so she can write back
  message: string;
  // Honeypot. No visitor sees this field, so no visitor fills it; bots do.
  website: string;
};

export type ContactResult = { ok: true } | { ok: false; error: string };

const WRITE_TO_US =
  "Нещо се обърка при изпращането. Моля, пишете ни по Messenger или Viber, или ни се обадете.";

// Only a single plain address goes into the reply header — a list or anything
// with spaces in it stays in the body text instead of the header.
const PLAIN_EMAIL = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;

// Throttling the send. This form and submitRequest are public and every email
// spends the owner's Resend quota, so each has a cap per caller and a cap
// overall. Each keeps its own Map of sends: spam on the contact form can't use
// up the caps her request emails need, and the other way round. (Resend's own
// daily quota is still one, shared by both.)
// Best-effort only: each serverless instance keeps its own Maps, so this stops
// a runaway loop or a casual script, not a determined attacker.
const PER_IP_WINDOW_MS = 10 * 60 * 1000;
const PER_IP_SENDS = 3;
const GLOBAL_WINDOW_MS = 60 * 60 * 1000;
const GLOBAL_SENDS = 60;

const contactSends = new Map<string, number[]>();
const requestSends = new Map<string, number[]>();

// Netlify sets x-nf-client-connection-ip; x-forwarded-for is the fallback and
// its first entry is the client. Callers we can't place share one bucket, so
// a missing IP doesn't become a way around the limit.
async function callerIp() {
  const headerList = await headers();
  const netlifyIp = headerList.get("x-nf-client-connection-ip")?.trim();
  if (netlifyIp) return netlifyIp;
  const forwarded = headerList.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || "unknown";
}

// true when this send is within both caps — and then counts it. Drops expired
// timestamps on every call, so the Map never holds more than the last hour.
function allowSend(sends: Map<string, number[]>, ip: string) {
  const now = Date.now();
  let total = 0;
  for (const [key, times] of sends) {
    const fresh = times.filter((at) => now - at < GLOBAL_WINDOW_MS);
    if (fresh.length) sends.set(key, fresh);
    else sends.delete(key);
    total += fresh.length;
  }
  if (total >= GLOBAL_SENDS) return false;

  const mine = sends.get(ip) ?? [];
  const inWindow = mine.filter((at) => now - at < PER_IP_WINDOW_MS);
  if (inWindow.length >= PER_IP_SENDS) return false;

  sends.set(ip, [...mine, now]);
  return true;
}

export async function submitContactMessage(
  payload: ContactPayload,
): Promise<ContactResult> {
  // Same shape as the form sends, or it's a hand-built call.
  if (!payload || typeof payload !== "object") {
    return { ok: false, error: SEND_FAILED };
  }
  if (
    !isTextUpTo(payload.name, MAX_SHORT_TEXT) ||
    !isTextUpTo(payload.phone, MAX_SHORT_TEXT) ||
    !isTextUpTo(payload.email, MAX_SHORT_TEXT) ||
    !isTextUpTo(payload.message, MAX_NOTE) ||
    typeof payload.website !== "string"
  ) {
    return { ok: false, error: SEND_FAILED };
  }

  // A filled honeypot is a bot. Say it went fine and send nothing.
  if (payload.website.trim()) return { ok: true };

  const name = payload.name.trim();
  const phone = payload.phone.trim();
  const email = payload.email.trim();
  const message = payload.message.trim();

  if (!name) return { ok: false, error: "Моля, попълнете името си." };
  if (!phone) return { ok: false, error: "Моля, попълнете телефон." };
  if (!message) return { ok: false, error: "Моля, напишете съобщение." };

  // Counted only here, where a send is actually about to happen: a bot that
  // tripped the honeypot above never reaches this line, so it costs nothing.
  if (!allowSend(contactSends, await callerIp())) {
    return { ok: false, error: WRITE_TO_US };
  }

  const sent = await sendOwnerEmail(
    // Whitespace collapsed: the name goes into a mail header, and a newline in
    // a header would split it.
    `Запитване от сайта — ${name.replace(/\s+/g, " ")}`,
    [
      `Име: ${name}`,
      `Телефон: ${phone}`,
      `Имейл: ${email || "(не е посочен)"}`,
      "",
      message,
    ].join("\n"),
    // Reply goes to the customer when they left one plain address. Anything
    // else stays in the body text above, where even a typo'd address still
    // reaches her; without this, Resend leaves the sender as the reply address.
    PLAIN_EMAIL.test(email) ? email : undefined,
  );

  return sent ? { ok: true } : { ok: false, error: WRITE_TO_US };
}
