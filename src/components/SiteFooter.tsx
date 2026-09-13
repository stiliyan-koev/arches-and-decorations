import Link from "next/link";
import { CONTACTS } from "@/lib/contacts";

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
              <a href={CONTACTS.phoneHref} className="opacity-85 hover:opacity-100">
                📞 {CONTACTS.phone}
              </a>
            </li>
            <li>
              <a
                href={`mailto:${CONTACTS.email}`}
                className="opacity-85 hover:opacity-100"
              >
                ✉️ {CONTACTS.email}
              </a>
            </li>
            <li>
              <a href={CONTACTS.instagram} className="opacity-85 hover:opacity-100">
                📷 Instagram
              </a>
            </li>
            <li>
              <a href={CONTACTS.facebook} className="opacity-85 hover:opacity-100">
                👍 Facebook
              </a>
            </li>
            <li className="opacity-85">📍 {CONTACTS.city}</li>
          </ul>
        </div>

        <div>
          <h3 className="mb-3 text-[1.05rem] text-white">Меню</h3>
          <ul className="flex flex-col gap-2.5 font-semibold">
            <li>
              <Link href="/#calc" className="opacity-85 hover:opacity-100">
                Конфигуратор
              </Link>
            </li>
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
          </ul>
        </div>
      </div>

      <div className="border-t border-white/15 py-4 text-center text-xs opacity-60">
        © {new Date().getFullYear()} {CONTACTS.brand} · {CONTACTS.city} · Цените
        в сайта са ориентировъчни
      </div>
    </footer>
  );
}
