// Placeholder — category filtering is build-order step 2.
export default async function CategoryPage({
  params,
}: PageProps<"/catalog/[category]">) {
  const { category } = await params;

  return (
    <div className="mx-auto max-w-[1120px] px-5 pt-14">
      <h1 className="text-4xl font-bold text-ink">Каталог</h1>
      <p className="mt-4 text-muted">
        Категория „{category}“ — очаквайте скоро.
      </p>
    </div>
  );
}
