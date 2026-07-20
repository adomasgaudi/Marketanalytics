/** Shared page footer: letterpress (debossed) text, plain strip. */
export function Footer() {
  return (
    <footer className="text-muted mt-8 mb-2 px-4 py-2.5 text-center text-[11px]">
      {/* .letterpress only bites under the refined skin, where it tints this
          line down to just off the page background. */}
      <span className="letterpress opacity-80">
        by adomasgaudi.github · data@marketanalytics.lt · © 2026
      </span>
    </footer>
  );
}
