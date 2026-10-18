// Arches without enough covers: a nudge above the basket lines, in the
// mini-basket and on /request. Not a block — she sorts it out when she calls.
export default function CoverWarning({
  shortfall,
}: {
  shortfall: { needed: number; have: number } | null;
}) {
  if (!shortfall) return null;
  const missing = shortfall.needed - shortfall.have;
  return (
    <p
      className="mt-3 rounded-item bg-surface-2 px-3.5 py-2.5 text-[0.82rem] font-bold text-rose-ink"
      role="status"
    >
      Арките в офертата са за {shortfall.needed}{" "}
      {shortfall.needed === 1 ? "калъф" : "калъфа"}, а сте избрали{" "}
      {shortfall.have}. Добавете още {missing}{" "}
      {missing === 1 ? "калъф" : "калъфа"}.
    </p>
  );
}
