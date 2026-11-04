"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/catalog";
import { sendOwnerEmail } from "@/lib/mail";
import { formatDate, formatPrice, formatTotal, QUOTE_LABEL } from "@/lib/format";
import { getLabourPrice } from "@/lib/settings";

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
// 30 lines × 20 pieces of her dearest product stays far below this; a bigger
// "estimate" is a hand-built call and is stored as unknown.
const MAX_ESTIMATE = 100_000;
const HH_MM = /^\d{2}:\d{2}(:\d{2})?$/; // what <input type="time"> sends

const SEND_FAILED = "Нещо се обърка при изпращането. Моля, опитайте отново.";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function isTextUpTo(value: unknown, maxLength: number) {
  return typeof value === "string" && value.length <= maxLength;
}

// The longest date range the availability reads accept — a long rental, with
// room to spare. These are public endpoints, so a hand-built call can't read
// totals across years; anything else reads as "nothing booked".
const MAX_RANGE_DAYS = 62;
// How far ahead a date may be. The form uses a date picker, so anything past
// this is a hand-built call — and unbounded, one booking could claim her stock
// until 2099 the moment she confirms it.
const MAX_AHEAD_DAYS = 730;
const DAY_MS = 24 * 60 * 60 * 1000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Two yyyy-mm-dd dates, in order, at most MAX_RANGE_DAYS apart.
function isDateRange(from: unknown, to: unknown) {
  if (typeof from !== "string" || typeof to !== "string") return false;
  if (!ISO_DATE.test(from) || !ISO_DATE.test(to) || from > to) return false;
  const days = (Date.parse(to) - Date.parse(from)) / DAY_MS;
  return Number.isFinite(days) && days <= MAX_RANGE_DAYS;
}

// One yyyy-mm-dd date that is neither in the past nor absurdly far ahead. The
// -1 lower bound lets today through whatever the server's clock zone, while a
// hand-built call can't book 1990 and have it sit in her inbox as a party.
function isBookableDate(date: unknown) {
  if (typeof date !== "string") return false;
  const days = (Date.parse(date) - Date.now()) / 86_400_000;
  return Number.isFinite(days) && days >= -1 && days <= MAX_AHEAD_DAYS;
}

type Supabase = Awaited<ReturnType<typeof createClient>>;
// The cookie-free client. The deferred email work in after() uses this one:
// see the comment there.
type PublicSupabase = ReturnType<typeof createPublicClient>;

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
    // A product's id. Anything that isn't a uuid is caught here rather than by
    // the items insert, which would otherwise die after the booking row was
    // already written.
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

  // The date and time inputs only send yyyy-mm-dd and hh:mm, so anything else
  // is a hand-built call. Checked here, before the insert: the email formats
  // them later, inside after(), where a throw would lose it.
  const dates = isRental ? [payload.startDate, payload.endDate] : [payload.eventDate];
  if (!dates.every((date) => typeof date === "string" && ISO_DATE.test(date))) {
    return { ok: false, error: SEND_FAILED };
  }
  // A rental must be a real range: in order, and no longer than the
  // availability reads above actually look (MAX_RANGE_DAYS). Without this a
  // hand-built call could store 2026-01-01 → 2099-01-01, and the moment she
  // confirms it reserved_qty() reports her whole stock booked for that span.
  if (isRental && !isDateRange(payload.startDate, payload.endDate)) {
    return { ok: false, error: SEND_FAILED };
  }
  if (!dates.every(isBookableDate)) {
    return { ok: false, error: SEND_FAILED };
  }
  if (
    !isRental &&
    payload.eventTime &&
    !(typeof payload.eventTime === "string" && HH_MM.test(payload.eventTime))
  ) {
    return { ok: false, error: SEND_FAILED };
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

  // „Труд за украса“ in the email is her own price from the settings table,
  // never the browser's number. The browser only says whether the basket went
  // with the label (a positive labourPrice).
  const sentLabour = payload.labourPrice;
  const withLabour =
    typeof sentLabour === "number" &&
    Number.isFinite(sentLabour) &&
    sentLabour > 0 &&
    sentLabour <= MAX_ESTIMATE;
  const labourPrice = withLabour ? await getLabourPrice() : 0;

  // Only an estimate for the admin to read; anything that isn't a sane number
  // is stored as "unknown" rather than as-is. The browser's total has its own
  // labour figure in it, which can be up to 5 minutes old (the catalog is
  // cached), so that one is swapped for hers: the labour line and the total
  // in the email then add up.
  const sentTotal =
    Number.isFinite(payload.estimatedTotal) &&
    payload.estimatedTotal >= 0 &&
    payload.estimatedTotal <= MAX_ESTIMATE
      ? payload.estimatedTotal
      : null;
  const estimatedTotal =
    sentTotal !== null && withLabour
      ? Math.min(MAX_ESTIMATE, Math.max(0, sentTotal - sentLabour + labourPrice))
      : sentTotal;

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
  // which booking she wasn't told about. Throttled like the contact form, but
  // with its own per-IP cap and the whole hourly budget (the contact form is
  // refused at a lower shared total), so spam there can't stop these emails. The
  // product lookup inside uses the cookie-free client: `supabase` belongs to a
  // request that has already been answered, and touching cookies() after that
  // can throw — losing the email and skipping the very log line below.
  const ip = await callerIp();
  after(async () => {
    let emailed = false;
    if (allowSend(requestSends, ip, REQUEST_PER_IP_SENDS, GLOBAL_SENDS)) {
      emailed = await sendOwnerEmail(
        requestEmailSubject(payload, estimatedTotal),
        await requestEmailText(createPublicClient(), payload, estimatedTotal, labourPrice),
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
  supabase: PublicSupabase,
  payload: RequestPayload,
  estimatedTotal: number | null,
  labourPrice: number, // from the settings table; 0 = no label
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

  if (labourPrice > 0) {
    lines.push(`• Труд за украса — ${formatPrice(labourPrice)}`);
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
// Higher for requests: a customer told to split a basket („Под наем“ and
// „Украса с монтаж от нас“ in one go can't be sent) may send two or three in a row,
// and retry one. A 4th within 10 minutes still deserves an email.
const REQUEST_PER_IP_SENDS = 10;
const GLOBAL_WINDOW_MS = 60 * 60 * 1000;
const GLOBAL_SENDS = 60;
// The contact form stops earlier, so the rest of the hour's budget stays free
// for request emails: that email is her only notice of a booking, while a
// contact message that didn't arrive is retried by the person who wrote it.
const CONTACT_GLOBAL_SENDS = 40;

const contactSends = new Map<string, number[]>();
const requestSends = new Map<string, number[]>();
// Both maps leave through one Resend account with one daily allowance, so the
// hourly cap is counted across the two together: as two separate 60/hour
// budgets they add up to more than the account gets in a day, and once it is
// spent she stops hearing about real requests. The per-IP cap stays per map,
// so a flood of requests can't lock a visitor out of the contact form too, and
// each caller passes in its own share of that hourly total (see allowSend).
const ALL_SENDS = [contactSends, requestSends];

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
function allowSend(
  sends: Map<string, number[]>,
  ip: string,
  perIpSends: number,
  globalSends: number, // this caller's share of the hourly total
) {
  const now = Date.now();
  let total = 0;
  for (const map of ALL_SENDS) {
    for (const [key, times] of map) {
      const fresh = times.filter((at) => now - at < GLOBAL_WINDOW_MS);
      if (fresh.length) map.set(key, fresh);
      else map.delete(key);
      total += fresh.length;
    }
  }
  if (total >= globalSends) return false;

  const mine = sends.get(ip) ?? [];
  const inWindow = mine.filter((at) => now - at < PER_IP_WINDOW_MS);
  if (inWindow.length >= perIpSends) return false;

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
  if (!allowSend(contactSends, await callerIp(), PER_IP_SENDS, CONTACT_GLOBAL_SENDS)) {
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
