import { FAQ_GROUPS } from "@/lib/faq";

// The FAQ, grouped. One component for both places it shows: the homepage
// (group titles are h3 under its „Често задавани въпроси“ h2, two columns on
// desktop) and /vaprosi (h2 under the page's h1, one column). Each question
// is a native <details>: it opens without JavaScript, and the answer is in
// the HTML for search engines even while it's closed.
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
        <section key={group.title}>
          <GroupHeading className="text-lg md:text-xl">{group.title}</GroupHeading>
          <div className="mt-3 border-t border-border">
            {group.items.map((item) => (
              <details key={item.question} className="group border-b border-border">
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
        </section>
      ))}
    </div>
  );
}
