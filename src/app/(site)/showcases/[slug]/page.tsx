import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getShowcaseBySlug } from "@/lib/showcases";
import { showcaseParagraphs } from "@/lib/home";
import { CONTACTS } from "@/lib/contacts";

// Shared per-request so generateMetadata and the page don't both hit the DB.
const loadShowcase = cache(getShowcaseBySlug);

// Cached like the homepage: rebuilt at most every 5 minutes, and straight
// away when she saves a showcase (revalidatePath in admin/actions.ts). No
// page is built ahead: each one is made on its first visit, then cached.
export const revalidate = 300;
export async function generateStaticParams() {
  return [];
}

// The search-result snippet: the start of the story, cut at a word.
function summary(body: string) {
  const text = body.replace(/\s+/g, " ").trim();
  if (text.length <= 155) return text;
  const cut = text.lastIndexOf(" ", 152);
  return `${text.slice(0, cut > 0 ? cut : 152)}…`;
}

export async function generateMetadata({
  params,
}: PageProps<"/showcases/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const showcase = await loadShowcase(slug);
  if (!showcase) return { title: "Украсата не е намерена" };

  // Shared, the link shows the decoration's own first photo, not the
  // site-wide card. openGraph replaces the layout's whole, so siteName and
  // locale are repeated here.
  const photo = { url: showcase.photos[0], alt: showcase.title };
  return {
    title: showcase.title,
    description: summary(showcase.body),
    alternates: { canonical: `/showcases/${showcase.slug}` },
    openGraph: {
      type: "article",
      locale: "bg_BG",
      siteName: CONTACTS.brand,
      images: [photo],
    },
    twitter: { card: "summary_large_image", images: [photo] },
  };
}

// One finished decoration („Вдъхнови се“ on the homepage) on a page of its
// own: the same title, text and photos as its popup there, so the story can
// be found in search and shared as a link. Ends with a way to ask for one.
export default async function ShowcasePage({
  params,
}: PageProps<"/showcases/[slug]">) {
  const { slug } = await params;
  const showcase = await loadShowcase(slug);
  if (!showcase) notFound();

  return (
    <article className="mx-auto max-w-[760px] px-5 pt-10 pb-16 md:pt-14">
      <nav className="text-[0.8rem] text-muted">
        <Link href="/" className="hover:text-cta">
          Начало
        </Link>{" "}
        · Украси
      </nav>
      <h1 className="mt-2 text-3xl font-bold text-ink sm:text-4xl">
        {showcase.title}
      </h1>
      {showcaseParagraphs(showcase.body).map((text, index) => (
        <p key={index} className="mt-4 text-base leading-relaxed whitespace-pre-line md:text-[17px]">
          {text}
        </p>
      ))}

      <div className="mt-8 space-y-3">
        {showcase.photos.map((src, index) => (
          // The real size isn't stored: 4:5 holds the space until the photo
          // loads, then h-auto gives it its own shape (as in the popup).
          <Image
            key={src}
            src={src}
            alt={`${showcase.title} — снимка ${index + 1}`}
            width={1600}
            height={2000}
            sizes="(min-width: 800px) 720px, 100vw"
            preload={index === 0}
            className="h-auto w-full rounded-item bg-surface-2"
          />
        ))}
      </div>

      <div className="mt-10 rounded-card border border-border bg-surface-2 p-6 text-center md:p-8">
        <h2 className="text-xl md:text-2xl">Искате подобна украса?</h2>
        <p className="mt-2 text-muted">
          Изберете от каталога и вижте ориентировъчна цена, или ни пишете —
          ще я направим по ваш вкус.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link
            href="/catalog"
            className="inline-flex h-12 items-center rounded-full bg-cta px-7 text-[15px] font-extrabold text-white transition-colors hover:bg-cta-strong"
          >
            Към каталога
          </Link>
          <Link
            href="/about"
            className="inline-flex h-12 items-center rounded-full border-[1.5px] border-ink px-7 text-[15px] font-extrabold text-ink transition-colors hover:border-cta hover:text-cta"
          >
            Свържете се с нас
          </Link>
        </div>
      </div>
    </article>
  );
}
