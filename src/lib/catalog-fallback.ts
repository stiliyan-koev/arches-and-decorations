// TEMPORARY — mirrors seed.sql so the homepage is reviewable before Supabase
// exists. Once you've created the project and run schema.sql + seed.sql, the
// real data takes over automatically and this file can be deleted.
//
// The ids here are slugs, not UUIDs: they're only used as React keys. Sending a
// request needs a real database, and submitRequest() refuses without one.
import type { CatalogGroup } from "@/lib/types";

export const FALLBACK_GROUPS: CatalogGroup[] = [
  {
    id: "arches",
    slug: "arches",
    name: "Арки",
    products: [
      { id: "arch-oval-180x80", slug: "arch-oval-180x80", name: "Овална арка 180×80 см", base_price: 60, pricing_type: "fixed", colors: [] },
      { id: "arch-oval-165x50", slug: "arch-oval-165x50", name: "Овална арка 165×50 см", base_price: 55, pricing_type: "fixed", colors: [] },
      { id: "arch-round-180", slug: "arch-round-180", name: "Кръгла арка 180 см", base_price: 65, pricing_type: "fixed", colors: [] },
    ],
  },
  {
    id: "covers",
    slug: "covers",
    name: "Калъфи за арки",
    products: [
      {
        id: "arch-cover",
        slug: "arch-cover",
        name: "Калъф за арка",
        base_price: 30,
        pricing_type: "fixed",
        colors: [
          { id: "c-white", color_slug: "white", color_name: "Бял", hex: "#FFFFFF", sort: 1 },
          { id: "c-red", color_slug: "red", color_name: "Червен", hex: "#D33333", sort: 2 },
          { id: "c-yellow", color_slug: "yellow", color_name: "Жълт", hex: "#F2C200", sort: 3 },
          { id: "c-blue", color_slug: "blue", color_name: "Син", hex: "#2E6FD6", sort: 4 },
          { id: "c-pink", color_slug: "pink", color_name: "Розов", hex: "#E68AB8", sort: 5 },
          { id: "c-elsa", color_slug: "elsa-castle", color_name: "Замък на Елза", hex: null, sort: 6 },
          { id: "c-check", color_slug: "blue-check", color_name: "Син на квадратчета", hex: null, sort: 7 },
        ],
      },
    ],
  },
  {
    id: "balloons",
    slug: "balloons",
    name: "Балони",
    products: [
      {
        id: "balloons",
        slug: "balloons",
        name: "Балони (различни цветове)",
        base_price: 40,
        pricing_type: "fixed",
        colors: [
          { id: "b-white", color_slug: "white", color_name: "Бял", hex: "#FFFFFF", sort: 1 },
          { id: "b-red", color_slug: "red", color_name: "Червен", hex: "#D33333", sort: 2 },
          { id: "b-blue", color_slug: "blue", color_name: "Син", hex: "#2E6FD6", sort: 3 },
          { id: "b-pink", color_slug: "pink", color_name: "Розов", hex: "#E68AB8", sort: 4 },
          { id: "b-gold", color_slug: "gold", color_name: "Златен", hex: "#D4A24E", sort: 5 },
          { id: "b-pastel", color_slug: "pastel", color_name: "Пастел", hex: "#F2D9E6", sort: 6 },
        ],
      },
    ],
  },
  {
    id: "balloon-figures",
    slug: "balloon-figures",
    name: "Фигури с балони",
    products: [
      { id: "figure-number-1", slug: "figure-number-1", name: "Цифра „1“ с кухина за балони", base_price: 50, pricing_type: "fixed", colors: [] },
    ],
  },
  {
    id: "character-figures",
    slug: "character-figures",
    name: "Фигурки герои",
    products: [
      { id: "figure-winnie", slug: "figure-winnie", name: "Мечо Пух и приятели", base_price: 40, pricing_type: "fixed", colors: [] },
      { id: "figure-baby-boss-1", slug: "figure-baby-boss-1", name: "Baby Boss (единица)", base_price: 40, pricing_type: "fixed", colors: [] },
      { id: "figure-elsa", slug: "figure-elsa", name: "Елза", base_price: 40, pricing_type: "fixed", colors: [] },
      { id: "figure-anna", slug: "figure-anna", name: "Анна", base_price: 40, pricing_type: "fixed", colors: [] },
      { id: "figure-olaf-sven", slug: "figure-olaf-sven", name: "Олаф и Свен", base_price: 40, pricing_type: "fixed", colors: [] },
    ],
  },
  {
    id: "signs",
    slug: "signs",
    name: "Надписи и табели",
    products: [
      { id: "sign-happy-birthday", slug: "sign-happy-birthday", name: "Надпис „Happy Birthday“ / рожден ден", base_price: null, pricing_type: "custom_quote", colors: [] },
      { id: "sign-christening", slug: "sign-christening", name: "Надпис за кръщене", base_price: null, pricing_type: "custom_quote", colors: [] },
      { id: "sign-bride-to-be", slug: "sign-bride-to-be", name: "Надпис „Bride to be“", base_price: null, pricing_type: "custom_quote", colors: [] },
      { id: "table-signs-pink", slug: "table-signs-pink", name: "Табелки за маса (розови)", base_price: 15, pricing_type: "fixed", colors: [] },
    ],
  },
  {
    id: "props",
    slug: "props",
    name: "Аксесоари",
    products: [
      { id: "photo-mirror", slug: "photo-mirror", name: "Огледало за снимки", base_price: 50, pricing_type: "fixed", colors: [] },
      { id: "sign-stand", slug: "sign-stand", name: "Стойка за табели", base_price: 20, pricing_type: "fixed", colors: [] },
      {
        id: "easel",
        slug: "easel",
        name: "Статив",
        base_price: 25,
        pricing_type: "fixed",
        colors: [
          { id: "e-wood", color_slug: "wood", color_name: "Дървен", hex: "#B08A5B", sort: 1 },
          { id: "e-metal", color_slug: "metal", color_name: "Метален", hex: "#9AA0A6", sort: 2 },
        ],
      },
    ],
  },
];
