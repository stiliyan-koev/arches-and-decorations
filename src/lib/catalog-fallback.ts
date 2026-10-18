// TEMPORARY — mirrors the live catalog (seed.sql + migration-configurator.sql)
// so the homepage is reviewable before Supabase exists. Once the project is set
// up the real data takes over automatically and this file can be deleted.
//
// The ids here are slugs, not UUIDs: they're only used as React keys and to
// resolve recommend_category_id (arches -> covers). Sending a request needs a
// real database, and submitRequest() refuses without one. Availability also
// needs one — with no database every product just shows the `quantity` below,
// because nothing is booked yet.
import type { CatalogGroup } from "@/lib/types";

// A category that's off by default: not shown as its own family, no add-on wiring.
const NOT_A_FAMILY = {
  in_configurator: false,
  description: null,
  add_label: null,
  picker: "dropdown" as const,
  recommend_category_id: null,
  recommend_title: null,
  recommend_hint: null,
  recommend_label: null,
};

export const FALLBACK_GROUPS: CatalogGroup[] = [
  {
    id: "arches",
    slug: "arches",
    name: "Арки",
    in_configurator: true,
    description: "Основата на украсата - рамка, която обличаме в цвят.",
    add_label: "Добави арка",
    picker: "dropdown",
    recommend_category_id: "covers",
    recommend_title: "За тази арка препоръчваме да изберете калъф",
    recommend_hint: "Калъфът се поставя върху рамката и задава цвета на украсата.",
    recommend_label: "Калъф",
    products: [
      {
        id: "arch-oval-180x80", slug: "arch-oval-180x80", name: "Овална арка 180×80 см",
        option_group: "Овална арка", base_price: 60, pricing_type: "fixed",
        quantity: 2, track_availability: true, offer_mode: "both", covers_needed: 1,
        colors: [], images: [],
      },
      {
        id: "arch-oval-165x50", slug: "arch-oval-165x50", name: "Овална арка 165×50 см",
        option_group: "Овална арка", base_price: 55, pricing_type: "fixed",
        quantity: 2, track_availability: true, offer_mode: "both", covers_needed: 1,
        colors: [], images: [],
      },
      {
        id: "arch-round-180", slug: "arch-round-180", name: "Кръгла арка 180 см",
        option_group: "Кръгла арка", base_price: 65, pricing_type: "fixed",
        quantity: 3, track_availability: true, offer_mode: "both", covers_needed: 1,
        colors: [], images: [],
      },
    ],
  },
  {
    id: "covers",
    slug: "covers",
    name: "Калъфи за арки",
    ...NOT_A_FAMILY, // only ever the arch add-on
    products: [
      {
        id: "arch-cover", slug: "arch-cover", name: "Калъф за арка",
        option_group: null, base_price: 30, pricing_type: "fixed",
        // The sum of its colours' counts, as getCatalog() works it out.
        quantity: 7, track_availability: true, offer_mode: "both", covers_needed: 0,
        colors: [
          { id: "c-white", color_slug: "white", color_name: "Бял", hex: "#FFFFFF", quantity: 1, sort: 1 },
          { id: "c-red", color_slug: "red", color_name: "Червен", hex: "#D33333", quantity: 1, sort: 2 },
          { id: "c-yellow", color_slug: "yellow", color_name: "Жълт", hex: "#F2C200", quantity: 1, sort: 3 },
          { id: "c-blue", color_slug: "blue", color_name: "Син", hex: "#2E6FD6", quantity: 1, sort: 4 },
          { id: "c-pink", color_slug: "pink", color_name: "Розов", hex: "#E68AB8", quantity: 1, sort: 5 },
          { id: "c-elsa", color_slug: "elsa-castle", color_name: "Замък на Елза", hex: null, quantity: 1, sort: 6 },
          { id: "c-check", color_slug: "blue-check", color_name: "Син на квадратчета", hex: null, quantity: 1, sort: 7 },
        ],
        images: [],
      },
    ],
  },
  {
    id: "balloons",
    slug: "balloons",
    name: "Балони",
    in_configurator: true,
    description: "Цветовете, които задават настроението на празника.",
    add_label: "Добави балони",
    picker: "text",
    recommend_category_id: null,
    recommend_title: null,
    recommend_hint: null,
    recommend_label: null,
    products: [
      {
        id: "balloons", slug: "balloons", name: "Балони (различни цветове)",
        option_group: null, base_price: 40, pricing_type: "fixed",
        quantity: 1, track_availability: false, offer_mode: "setup", covers_needed: 0,
        colors: [
          { id: "b-white", color_slug: "white", color_name: "Бял", hex: "#FFFFFF", quantity: 1, sort: 1 },
          { id: "b-red", color_slug: "red", color_name: "Червен", hex: "#D33333", quantity: 1, sort: 2 },
          { id: "b-blue", color_slug: "blue", color_name: "Син", hex: "#2E6FD6", quantity: 1, sort: 3 },
          { id: "b-pink", color_slug: "pink", color_name: "Розов", hex: "#E68AB8", quantity: 1, sort: 4 },
          { id: "b-gold", color_slug: "gold", color_name: "Златен", hex: "#D4A24E", quantity: 1, sort: 5 },
          { id: "b-pastel", color_slug: "pastel", color_name: "Пастел", hex: "#F2D9E6", quantity: 1, sort: 6 },
        ],
        images: [],
      },
    ],
  },
  {
    id: "character-figures",
    slug: "character-figures",
    name: "Фигурки герои",
    in_configurator: true,
    description: "Героят на празника - избира се направо от снимка.",
    add_label: "Добави фигурка",
    picker: "grid",
    recommend_category_id: null,
    recommend_title: null,
    recommend_hint: null,
    recommend_label: null,
    products: [
      {
        id: "figure-winnie", slug: "figure-winnie", name: "Мечо Пух и приятели",
        option_group: null, base_price: 40, pricing_type: "fixed",
        quantity: 1, track_availability: true, offer_mode: "both", covers_needed: 0,
        colors: [], images: [],
      },
      {
        id: "figure-baby-boss-1", slug: "figure-baby-boss-1", name: "Baby Boss (единица)",
        option_group: null, base_price: 40, pricing_type: "fixed",
        quantity: 1, track_availability: true, offer_mode: "both", covers_needed: 0,
        colors: [], images: [],
      },
      {
        id: "figure-elsa", slug: "figure-elsa", name: "Елза",
        option_group: null, base_price: 40, pricing_type: "fixed",
        quantity: 1, track_availability: true, offer_mode: "both", covers_needed: 0,
        colors: [], images: [],
      },
      {
        id: "figure-anna", slug: "figure-anna", name: "Анна",
        option_group: null, base_price: 40, pricing_type: "fixed",
        quantity: 1, track_availability: true, offer_mode: "both", covers_needed: 0,
        colors: [], images: [],
      },
      {
        id: "figure-olaf-sven", slug: "figure-olaf-sven", name: "Олаф и Свен",
        option_group: null, base_price: 40, pricing_type: "fixed",
        quantity: 1, track_availability: true, offer_mode: "both", covers_needed: 0,
        colors: [], images: [],
      },
    ],
  },
  {
    id: "signs",
    slug: "signs",
    name: "Надписи и табели",
    in_configurator: true,
    description: "Име, повод или цифра - за снимките и за масата.",
    add_label: "Добави надпис",
    picker: "dropdown",
    recommend_category_id: null,
    recommend_title: null,
    recommend_hint: null,
    recommend_label: null,
    products: [
      // The balloon number figure lives here (moved out of the balloon-figures category).
      {
        id: "figure-number-1", slug: "figure-number-1", name: "Цифра „1“ с кухина за балони",
        option_group: "Цифра с балони", base_price: 50, pricing_type: "fixed",
        quantity: 1, track_availability: true, offer_mode: "both", covers_needed: 0,
        colors: [], images: [],
      },
      {
        id: "sign-happy-birthday", slug: "sign-happy-birthday", name: "Надпис „Happy Birthday“ / рожден ден",
        option_group: "Пластмасов надпис", base_price: null, pricing_type: "custom_quote",
        quantity: 1, track_availability: true, offer_mode: "both", covers_needed: 0,
        colors: [], images: [],
      },
      {
        id: "sign-christening", slug: "sign-christening", name: "Надпис за кръщене",
        option_group: "Пластмасов надпис", base_price: null, pricing_type: "custom_quote",
        quantity: 1, track_availability: true, offer_mode: "both", covers_needed: 0,
        colors: [], images: [],
      },
      {
        id: "sign-bride-to-be", slug: "sign-bride-to-be", name: "Надпис „Bride to be“",
        option_group: "Пластмасов надпис", base_price: null, pricing_type: "custom_quote",
        quantity: 1, track_availability: true, offer_mode: "both", covers_needed: 0,
        colors: [], images: [],
      },
      {
        id: "table-signs-pink", slug: "table-signs-pink", name: "Табелки за маса (розови)",
        option_group: "Табелки за маса", base_price: 15, pricing_type: "fixed",
        quantity: 1, track_availability: true, offer_mode: "both", covers_needed: 0,
        colors: [], images: [],
      },
    ],
  },
  {
    id: "props",
    slug: "props",
    name: "Аксесоари",
    in_configurator: true,
    description: "За кът за снимки и за поставяне на табели.",
    add_label: "Добави огледало / стойка",
    picker: "dropdown",
    recommend_category_id: null,
    recommend_title: null,
    recommend_hint: null,
    recommend_label: null,
    products: [
      {
        id: "photo-mirror", slug: "photo-mirror", name: "Огледало за снимки",
        option_group: "Огледало за снимки", base_price: 50, pricing_type: "fixed",
        quantity: 1, track_availability: true, offer_mode: "both", covers_needed: 0,
        colors: [], images: [],
      },
      {
        // No option_group on purpose (matches live) — this stays hidden in the modal until it gets one.
        id: "sign-stand", slug: "sign-stand", name: "Стойка за табели",
        option_group: null, base_price: 20, pricing_type: "fixed",
        quantity: 1, track_availability: true, offer_mode: "both", covers_needed: 0,
        colors: [], images: [],
      },
      {
        id: "easel", slug: "easel", name: "Статив",
        option_group: "Статив", base_price: 25, pricing_type: "fixed",
        quantity: 2, track_availability: true, offer_mode: "both", covers_needed: 0,
        colors: [
          { id: "e-wood", color_slug: "wood", color_name: "Дървен", hex: "#B08A5B", quantity: 1, sort: 1 },
          { id: "e-metal", color_slug: "metal", color_name: "Метален", hex: "#9AA0A6", quantity: 1, sort: 2 },
        ],
        images: [],
      },
    ],
  },
];
