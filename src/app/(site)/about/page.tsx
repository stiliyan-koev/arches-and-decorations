import type { Metadata } from "next";
import { CONTACTS } from "@/lib/contacts";
import {
  FacebookIcon,
  MessengerIcon,
  TikTokIcon,
  ViberIcon,
} from "@/components/SocialIcons";
import ContactMessageForm from "@/components/about/ContactMessageForm";

export const metadata: Metadata = {
  title: "За нас",
  description:
    "Правим балонните украси сами и ги подреждаме на място във Варна и до около 50 км от града. Пишете ни по Messenger, Viber или през формата за контакт.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-[1120px] px-5 pt-14 pb-8">
      <h1 className="text-4xl font-bold text-ink">За нас</h1>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5 text-muted">
          <h2 className="text-xl font-semibold text-ink">
            Балонни украси във Варна и региона
          </h2>
          <p className="text-lg">
            Изработваме балонни украси и арки за най-хубавите дни — рождени
            дни, кръщенета, сватби, момински партита и всеки друг повод за
            празник. Всяка украса правим сами, с грижа към детайла и към повода.
          </p>
          <p>
            Работим във {CONTACTS.city} и до около 50 км от града — за адреси
            извън града се начислява такса за път. Идваме на място, подреждаме
            украсата за около два часа и след празника прибираме всичко —
            балоните остават за вас. Ако предпочитате да подредите сами, даваме
            под наем арки, калъфи, фигурки герои и аксесоари за три дни.
          </p>
          <p>
            Видели сте идея някъде? Изпратете ни снимка. Почти винаги можем да
            я направим или да предложим нещо близко до нея — във ваши цветове, с
            име, надпис или любим герой.
          </p>
        </div>

        <aside className="h-fit rounded-card border border-border bg-surface p-6 shadow-card">
          <h2 className="text-xl font-semibold text-ink">Свържете се с нас</h2>
          <p className="mt-2 text-sm text-muted">
            Най-бързо отговаряме на съобщение по{" "}
            <strong className="font-semibold text-ink">Messenger</strong> или{" "}
            <strong className="font-semibold text-ink">Viber</strong> — това са
            предпочитаните начини.
          </p>

          <div className="mt-4 flex flex-col gap-2.5">
            <a
              href={CONTACTS.messengerHref}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-cta px-5 font-extrabold text-white transition-colors hover:bg-cta-strong focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cta"
            >
              <MessengerIcon className="size-[18px]" /> Пишете по Messenger
            </a>
            <a
              href={CONTACTS.viberHref}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-border-strong bg-bg px-5 font-extrabold text-ink transition-colors hover:border-cta hover:text-cta focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cta"
            >
              <ViberIcon className="size-[18px]" /> Пишете по Viber
            </a>
          </div>

          <dl className="mt-5 space-y-4 text-sm">
            <div>
              <dt className="text-muted">Телефон</dt>
              <dd className="mt-1">
                <a
                  href={CONTACTS.phoneHref}
                  className="text-base font-bold text-ink hover:text-cta"
                >
                  {CONTACTS.phone}
                </a>
              </dd>
              {/* The Viber button above opens a chat with this same number, but
                  only on a device with Viber — so the number stays a plain
                  tel: link that works everywhere. */}
              <dd className="mt-1 text-xs text-muted">
                Същият номер е и във Viber.
              </dd>
            </div>
            <div>
              <dt className="text-muted">TikTok</dt>
              <dd className="mt-1">
                <a
                  href={CONTACTS.tiktok}
                  className="inline-flex items-center gap-2 text-ink hover:text-cta"
                >
                  <TikTokIcon /> TikTok
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-muted">Facebook</dt>
              <dd className="mt-1">
                <a
                  href={CONTACTS.facebook}
                  className="inline-flex items-center gap-2 text-ink hover:text-cta"
                >
                  <FacebookIcon /> Facebook
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-muted">Град</dt>
              <dd className="mt-1 text-ink">{CONTACTS.city}</dd>
            </div>
          </dl>
        </aside>
      </div>

      <section className="mx-auto mt-12 max-w-xl">
        <ContactMessageForm />
      </section>
    </div>
  );
}
