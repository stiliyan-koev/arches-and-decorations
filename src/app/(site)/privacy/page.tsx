import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { CONTACTS } from "@/lib/contacts";

export const metadata: Metadata = {
  title: "Политика за поверителност",
  description:
    "Какви лични данни събираме чрез сайта, защо, колко дълго ги пазим и какви са правата ви.",
  alternates: { canonical: "/privacy" },
};

// Bump this whenever the text below changes.
const UPDATED = "4 ноември 2026 г.";

// The GDPR notice (чл. 13): who keeps the customer's data, what, why, for how
// long, who else sees it, and their rights. It has to stay true to the code:
// - the 12 months match forget_old_requests() in schema.sql;
// - the request's email copy in Gmail is deleted by hand (owner item in PROGRESS.md);
// - the cookie section lists everything that sets a cookie or loads a third-party
//   script. Only Google Ads does, and only after a yes in CookieBanner. Anything
//   new goes behind that banner too, and this page changes with it.
// No email address on purpose, same as /about (see contacts.ts).
export default function PrivacyPage() {
  const controller = CONTACTS.legalName || CONTACTS.brand;

  return (
    <div className="mx-auto max-w-3xl px-5 pt-14 pb-12">
      {/* 3xl on phones: „поверителност“ is one long word in Unbounded and
          doesn't fit 375px at 4xl. */}
      <h1 className="text-3xl font-bold text-ink sm:text-4xl">
        Политика за поверителност
      </h1>
      <p className="mt-3 text-sm text-muted">Последна актуализация: {UPDATED}</p>

      <div className="mt-8 space-y-4 text-muted">
        <p className="text-lg">
          Събираме само данните, без които не можем да ви се обадим за украсата —
          и нищо повече. Сайтът няма онлайн плащане и регистрация, а проследяване
          има само ако го приемете.
        </p>
      </div>

      <Section title="Кой отговаря за данните ви">
        <p>
          Администратор на личните данни е{" "}
          <strong className="font-semibold text-ink">{controller}</strong>, гр.{" "}
          {CONTACTS.city}. Можете да се свържете с нас:
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            по телефона:{" "}
            <a href={CONTACTS.phoneHref} className={LINK}>
              {CONTACTS.phone}
            </a>
          </li>
          <li>
            по{" "}
            <a href={CONTACTS.messengerHref} className={LINK}>
              Messenger
            </a>{" "}
            или{" "}
            <a href={CONTACTS.viberHref} className={LINK}>
              Viber
            </a>
          </li>
          <li>
            чрез формата „Пишете ни“ на страницата{" "}
            <Link href="/about" className={LINK}>
              За нас
            </Link>
          </li>
        </ul>
      </Section>

      <Section title="Какви данни събираме и защо">
        <Purpose
          title="Запитване за украса (страница „Запитване“)"
          what="телефон, име (по желание), град, дата и час на събитието или дати за наем, бележка, описаните от вас изисквания и избраните артикули."
          why="за да ви се обадим, да проверим наличността за датата ви и да уговорим среща, на която уточняваме цената."
          basis="предприемане на стъпки по ваше искане преди сключване на договор — чл. 6, ал. 1, б. „б“ от Регламент (ЕС) 2016/679 (GDPR)."
          kept="до 12 месеца след датата на събитието. След това името, телефонът, бележката и изискванията се изтриват автоматично; остават само поръчаните артикули, количествата, датите, градът и цените, без нищо, което да ви посочи. Копието на запитването, което получаваме по имейл, изтриваме ръчно в същия срок."
        />
        <Purpose
          title="Съобщение от формата „Пишете ни“"
          what="име, телефон, имейл (по желание) и текстът на съобщението."
          why="за да ви отговорим."
          basis="стъпки по ваше искане (чл. 6, ал. 1, б. „б“) или нашият легитимен интерес да отговорим на съобщението ви (чл. 6, ал. 1, б. „е“)."
          kept="съобщението не се записва в сайта — пристига при нас като имейл. Изтриваме го, когато вече не е нужно, но не по-късно от 12 месеца след последния ни разговор."
        />
        <Purpose
          title="Технически данни"
          what="IP адресът, от който се изпраща запитване или съобщение."
          why="за да ограничим броя изпращания от един адрес и да спрем спама. Хостинг доставчикът ни води и кратки технически журнали за сигурност."
          basis="легитимен интерес — сигурността на сайта (чл. 6, ал. 1, б. „е“)."
          kept="държим го само в паметта на сървъра, за кратко (обикновено около час), и не го записваме никъде."
        />
        <p>
          За запитване е нужен само телефон, а за формата „Пишете ни“ — име,
          телефон и съобщение. Без тях не можем да се свържем с вас; всичко
          останало е по желание. Не вземаме автоматизирани решения и не правим
          профилиране.
        </p>
        <p>
          Ако след срещата сключим договор, документите по него пазим толкова,
          колкото изисква законът.
        </p>
      </Section>

      <Section title="Кой още вижда данните">
        <p>
          Не продаваме данните ви, а това, което ни пишете във формите, не
          даваме за реклама. Освен нас ги обработват само доставчиците, чрез
          които работи сайтът:
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong className="font-semibold text-ink">Netlify</strong> — хостинг
            на сайта;
          </li>
          <li>
            <strong className="font-semibold text-ink">Supabase</strong> — базата
            данни, в която пазим запитванията (сървър във Франкфурт, Германия);
          </li>
          <li>
            <strong className="font-semibold text-ink">Resend</strong> — изпраща
            ни имейл за всяко ново запитване и съобщение;
          </li>
          <li>
            <strong className="font-semibold text-ink">Google (Gmail)</strong> —
            пощенската кутия, в която получаваме тези имейли;
          </li>
          <li>
            <strong className="font-semibold text-ink">Google Ads</strong> — само
            ако приемете бисквитките, вижте „Бисквитки и проследяване“.
          </li>
        </ul>
        <p>
          Някои от тях са компании от САЩ. Когато данни се пренасят извън
          Европейския съюз, това става въз основа на Рамката за защита на данните
          между ЕС и САЩ или на стандартни договорни клаузи, одобрени от
          Европейската комисия.
        </p>
      </Section>

      <Section title="Бисквитки и проследяване">
        <p>
          Без вашето съгласие сайтът не използва бисквитки за статистика, реклама
          или проследяване и не зарежда нищо от Google, Facebook или други трети
          страни.
        </p>
        <p>Използваме само това, без което сайтът не работи:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <code className={CODE}>oferta.v1</code> в локалното хранилище на
            браузъра — помни артикулите, които добавяте в офертата, за да стигнат
            до страницата за запитване. Остава само във вашия браузър и се
            изчиства, когато изпратите запитването.
          </li>
          <li>
            <code className={CODE}>consent.v1</code> в локалното хранилище на
            браузъра — помни отговора ви за бисквитките, за да не ви питаме при
            всяко отваряне. Остава само във вашия браузър.
          </li>
          <li>
            бисквитки за вход (<code className={CODE}>sb-…-auth-token</code>) —
            само при вход в администрацията на сайта. Посетителите не ги
            получават.
          </li>
        </ul>
        <p>
          Ако приемете в прозореца за бисквитки, зареждаме и Google Ads. Така
          виждаме колко хора след клик върху наша реклама са ни се обадили, писали
          са ни по Viber или Messenger или са изпратили запитване. Google записва
          свои бисквитки (например <code className={CODE}>_gcl_au</code>, която се
          пази около 90 дни) и получава адреса на страницата, IP адреса и данни за
          браузъра ви. Името, телефонът и текстът на запитването ви не стигат до
          Google Ads. Не използваме бисквитките за персонализирана реклама.
        </p>
        <p>
          Основанието е вашето съгласие. Без него сайтът работи по същия начин.
          Можете да го оттеглите по всяко време от връзката „Бисквитки“ в долния
          край на всяка страница. Тогава изтриваме бисквитките{" "}
          <code className={CODE}>_gcl…</code> от нашия сайт и ви питаме отново.
        </p>
      </Section>

      <Section title="Социални мрежи">
        <p>
          Връзките към Facebook, Messenger, TikTok и Viber са обикновени връзки —
          нищо от тези платформи не се зарежда, докато не кликнете. Ако ни пишете
          там, данните ви се обработват и по правилата на съответната платформа.
        </p>
      </Section>

      <Section title="Вашите права">
        <p>По всяко време можете да поискате:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>достъп до данните си и копие от тях;</li>
          <li>поправка на неточни данни;</li>
          <li>изтриване на данните;</li>
          <li>ограничаване на обработването;</li>
          <li>
            да възразите срещу обработване, което се основава на легитимен
            интерес;
          </li>
          <li>да получите данните си в машинночетим вид (преносимост).</li>
        </ul>
        <p>
          Обадете се или ни пишете по някой от начините по-горе. Отговаряме до
          един месец. За да не дадем данните ви на чужд човек, може да ви помолим
          да потвърдите, че телефонът е ваш.
        </p>
        <p>
          Ако смятате, че нарушаваме правата ви, можете да подадете жалба до
          Комисията за защита на личните данни — гр. София 1592, бул. „Проф.
          Цветан Лазаров“ № 2,{" "}
          <a href="https://www.cpdp.bg" className={LINK}>
            www.cpdp.bg
          </a>
          .
        </p>
      </Section>
    </div>
  );
}

const LINK = "font-semibold text-ink underline underline-offset-2 hover:text-cta";
const CODE = "rounded bg-surface-2 px-1 py-0.5 text-[0.85em] text-ink";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold text-ink">{title}</h2>
      <div className="mt-3 space-y-3 text-muted">{children}</div>
    </section>
  );
}

// One reason we hold data: what, why, on what legal ground, for how long.
function Purpose({
  title,
  what,
  why,
  basis,
  kept,
}: {
  title: string;
  what: string;
  why: string;
  basis: string;
  kept: string;
}) {
  return (
    <div className="rounded-card border border-border bg-surface p-5 shadow-card">
      <h3 className="font-semibold text-ink">{title}</h3>
      <dl className="mt-3 space-y-2 text-sm">
        <PurposeRow label="Какво">{what}</PurposeRow>
        <PurposeRow label="Защо">{why}</PurposeRow>
        <PurposeRow label="Основание">{basis}</PurposeRow>
        <PurposeRow label="Колко дълго">{kept}</PurposeRow>
      </dl>
    </div>
  );
}

function PurposeRow({ label, children }: { label: string; children: string }) {
  return (
    <div>
      <dt className="inline font-bold text-ink">{label}: </dt>
      <dd className="inline">{children}</dd>
    </div>
  );
}
