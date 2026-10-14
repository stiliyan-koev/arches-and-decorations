import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/catalog";
import { signOut } from "./actions";

export const metadata = {
  title: "Админ",
  robots: { index: false, follow: false },
};

// Named after the public pages they feed, in the order a visitor meets them.
// „Категории“ and „Снимки“ have no page of their own on the site — they sit
// next to „Каталог“, which is what they feed.
const NAV = [
  { href: "/admin/home", label: "Начало" },
  { href: "/admin/products", label: "Каталог" },
  { href: "/admin/categories", label: "Категории" },
  { href: "/admin/photos", label: "Снимки" },
  { href: "/admin/gallery", label: "Галерия" },
  { href: "/admin/showcases", label: "Вдъхнови се" },
];

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  if (!isSupabaseConfigured()) {
    return (
      <main className="mx-auto max-w-[640px] px-5 py-20 text-center">
        <h1 className="text-2xl">Няма връзка с базата данни</h1>
        <p className="mt-3 text-muted">
          Липсват ключовете в <code>.env.local</code>.
        </p>
      </main>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Logged out, the only page that reaches here is the login form — and it
  // brings its own framing, so the admin chrome would just be noise.
  if (!user) return <>{children}</>;

  return (
    <>
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4">
          <Link href="/admin/products" className="font-display font-semibold">
            Админ панел
          </Link>

          <nav className="flex flex-wrap gap-x-4 gap-y-2 text-[0.95rem] font-bold">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-muted hover:text-cta"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-4 text-[0.85rem]">
            <Link href="/" className="font-bold text-muted hover:text-cta">
              Виж сайта →
            </Link>
            <span className="hidden text-muted sm:inline">{user.email}</span>
            <form action={signOut}>
              <button
                type="submit"
                className="cursor-pointer rounded-full border border-border-strong px-3 py-1.5 font-bold text-ink hover:border-cta hover:text-cta"
              >
                Изход
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1120px] flex-1 px-5 py-8">
        {children}
      </main>
    </>
  );
}
