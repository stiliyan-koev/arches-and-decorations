import { FAQ_GROUPS } from "@/lib/faq";
import { ChevronDownIcon } from "@/components/home/Icons";

// The FAQ, grouped. One component for both places it shows: the homepage
// (group titles are h3 under its „Често задавани въпроси“ h2, two columns on
// desktop) and /faq (h2 under the page's h1, one column). Each group and
// each question in it is a native <details>: they open without JavaScript,
// and the answers are in the HTML for search engines even while closed.
export default function Faq({
  groupHeading,
  className = "",
}: {
  groupHeading: "h2" | "h3";
  className?: string; // layout of the groups, set by the page
}) {
  const GroupHeading = groupHeading;

  return (
    <div className={className}>
      {FAQ_GROUPS.map((group) => (
        // Named group, so opening a section doesn't also turn the pluses
        // of the questions inside it (they use the plain `group`).
        <details
          key={group.title}
          className="group/section rounded-card border border-border bg-surface px-5"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-2.5 text-ink hover:text-cta focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cta [&::-webkit-details-marker]:hidden">
            <GroupHeading className="text-base md:text-lg">{group.title}</GroupHeading>
            <span className="shrink-0 text-cta transition-transform group-open/section:rotate-180 motion-reduce:transition-none">
              <ChevronDownIcon size={20} />
            </span>
          </summary>
          <div className="border-t border-border">
            {group.items.map((item) => (
              <details
                key={item.question}
                className="group border-b border-border last:border-b-0"
              >
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4 py-4 font-bold text-ink hover:text-cta focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cta [&::-webkit-details-marker]:hidden">
                  {item.question}
                  {/* A plus that turns into a cross when the answer is open. */}
                  <span
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-xl leading-none text-cta transition-transform group-open:rotate-45 motion-reduce:transition-none"
                  >
                    +
                  </span>
                </summary>
                <p className="pb-4 leading-relaxed text-muted">{item.answer}</p>
              </details>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}
