import Link from "next/link";
import { getShowcaseRows } from "@/lib/showcases";
import type { ShowcaseRow } from "@/lib/showcases";
import ShowcaseList from "@/components/admin/ShowcaseList";

export default async function AdminShowcasesPage() {
  // The tables come from migration-showcases.sql; until that has been run
  // the query fails, so say what to do instead of showing an error page.
  let showcases: ShowcaseRow[] | null = null;
  try {
    showcases = await getShowcaseRows();
  } catch {
    showcases = null;
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl">Украси</h1>
        {showcases && (
          <Link
            href="/admin/showcases/new"
            className="ml-auto rounded-full bg-cta px-5 py-2.5 font-extrabold text-white hover:bg-cta-strong"
          >
            + Нова украса
          </Link>
        )}
      </div>
      <p className="mt-1 mb-6 text-[0.9rem] text-muted">
        Готови украси отблизо: заглавие, кратък текст и снимки. Първите три със
        снимки са картите на началната страница; при клик се отварят с всички
        снимки.
      </p>

      {showcases ? (
        <ShowcaseList showcases={showcases} />
      ) : (
        <p className="rounded-item bg-booked/10 px-4 py-3 text-[0.9rem] font-bold text-booked">
          Украсите не могат да се заредят. Ако това е първият път, пуснете
          migration-showcases.sql в Supabase SQL редактора.
        </p>
      )}
    </>
  );
}
