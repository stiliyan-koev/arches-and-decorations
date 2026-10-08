import Link from "next/link";
import ShowcaseForm from "@/components/admin/ShowcaseForm";

export default function NewShowcasePage() {
  return (
    <>
      <Link
        href="/admin/showcases"
        className="text-[0.85rem] font-bold text-muted hover:text-cta"
      >
        ← Всички украси
      </Link>

      <h1 className="mt-3 mb-6 text-2xl">Нова украса</h1>

      <ShowcaseForm showcase={null} />

      <p className="mt-4 text-[0.85rem] text-muted">
        Снимките се добавят веднага след като създадете украсата.
      </p>
    </>
  );
}
