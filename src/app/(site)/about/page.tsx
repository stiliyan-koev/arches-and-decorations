import type { Metadata } from "next";
import { CONTACTS } from "@/lib/contacts";
import { FacebookIcon, TikTokIcon } from "@/components/SocialIcons";

export const metadata: Metadata = {
  title: "За нас",
  description:
    "Кои сме ние и как работим — балонни декорации и арки под наем във Варна. Контакти и как да ни намерите.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-[1120px] px-5 pt-14 pb-8">
      <h1 className="text-4xl font-bold text-ink">За нас</h1>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5 text-muted">
          <p className="text-lg">
            Изработваме балонни декорации, арки и фигури за най-хубавите дни —
            рождени дни, кръщенета и сватби. Всяка украса правим сами, с грижа
            към детайла и към повода.
          </p>
          <p>
            Работим в {CONTACTS.city} и региона. Освен готова декорация на място,
            даваме под наем арки, калъфи, фигурки герои и аксесоари, ако искате
            да подредите сами.
          </p>
          <p>
            Ако сте видели идея някъде — покажете ни я. Почти винаги можем да я
            направим или да измислим нещо близко до нея.
          </p>

          <div className="rounded-card border border-border bg-surface p-6 shadow-card">
            <h2 className="text-xl font-semibold text-ink">
              Как стигаме до цена
            </h2>
            <p className="mt-3">
              Цените в сайта са{" "}
              <strong className="font-medium text-ink">ориентировъчни</strong> —
              зависят от размера, броя балони, цветовете и мястото. Няма онлайн
              плащане и не се обвързвате с нищо.
            </p>
            <p className="mt-3">
              След вашето запитване се чуваме, уговаряме лична среща и там
              уточняваме финалната цена, наличността за вашата дата и всички
              детайли.
            </p>
          </div>
        </div>

        <aside className="h-fit rounded-card border border-border bg-surface p-6 shadow-card">
          <h2 className="text-xl font-semibold text-ink">
            Свържете се с нас
          </h2>
          <dl className="mt-5 space-y-4 text-sm">
            <div>
              <dt className="text-muted">Имейл</dt>
              <dd className="mt-1">
                <a
                  href={`mailto:${CONTACTS.email}`}
                  className="text-ink hover:text-cta"
                >
                  {CONTACTS.email}
                </a>
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
    </div>
  );
}
