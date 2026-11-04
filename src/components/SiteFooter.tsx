import Link from "next/link";
import CookieSettingsLink from "@/components/CookieSettingsLink";
import { CONTACTS } from "@/lib/contacts";
import {
  FacebookIcon,
  MessengerIcon,
  TikTokIcon,
  ViberIcon,
} from "@/components/SocialIcons";

export default function SiteFooter() {
  return (
    <footer id="about" className="mt-5 bg-ink text-[#F6EEF2]">
      <div className="mx-auto grid max-w-[1140px] gap-7 px-5 py-11 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="mb-2 font-display text-[1.3rem] font-bold text-white">
            🎈 {CONTACTS.brand}
          </div>
          <p className="text-sm leading-relaxed opacity-70">
            Изработваме балонени украси и арки за рождени дни, кръщенета и
            специални поводи във {CONTACTS.city}. Наем на реквизит или пълна
            украса на място.
          </p>
        </div>

        <div>
          <h3 className="mb-3 text-[1.05rem] text-white">Контакти</h3>
          <ul className="flex flex-col gap-2.5 font-semibold">
            <li>
              <a
                href={CONTACTS.phoneHref}
                className="opacity-85 hover:opacity-100"
              >
                📞 {CONTACTS.phone}
              </a>
            </li>
            <li>
              <a
                href={CONTACTS.messengerHref}
                className="inline-flex items-center gap-2 opacity-85 hover:opacity-100"
              >
                <MessengerIcon /> Messenger
              </a>
            </li>
            <li>
              <a
                href={CONTACTS.viberHref}
                className="inline-flex items-center gap-2 opacity-85 hover:opacity-100"
              >
                <ViberIcon /> Viber
              </a>
            </li>
            <li>
              <a
                href={CONTACTS.tiktok}
                className="inline-flex items-center gap-2 opacity-85 hover:opacity-100"
              >
                <TikTokIcon /> TikTok
              </a>
            </li>
            <li>
              <a
                href={CONTACTS.facebook}
                className="inline-flex items-center gap-2 opacity-85 hover:opacity-100"
              >
                <FacebookIcon /> Facebook
              </a>
            </li>
            <li className="opacity-85">📍 {CONTACTS.city}</li>
          </ul>
        </div>

        <div>
          <h3 className="mb-3 text-[1.05rem] text-white">Меню</h3>
          <ul className="flex flex-col gap-2.5 font-semibold">
            <li>
              <Link href="/catalog" className="opacity-85 hover:opacity-100">
                Каталог
              </Link>
            </li>
            <li>
              <Link href="/gallery" className="opacity-85 hover:opacity-100">
                Галерия
              </Link>
            </li>
            <li>
              <Link href="/about" className="opacity-85 hover:opacity-100">
                За нас
              </Link>
            </li>
            <li>
              <Link href="/faq" className="opacity-85 hover:opacity-100">
                Въпроси
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* Extra room at the bottom on phones: the configurator's summary bar is
          fixed to the viewport and would otherwise sit on top of this line. */}
      <div className="border-t border-white/15 py-4 pb-24 text-center text-xs opacity-60 lg:pb-4">
        © {new Date().getFullYear()} {CONTACTS.brand} · {CONTACTS.city} · Цените
        в сайта са ориентировъчни ·{" "}
        <Link href="/privacy" className="underline-offset-2 hover:underline">
          Поверителност
        </Link>
        <CookieSettingsLink />
      </div>
    </footer>
  );
}
