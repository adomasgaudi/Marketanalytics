import Link from "next/link";

const SECTIONS = [
  { href: "#markets", label: "Markets" },
  { href: "#companies", label: "Companies" },
  { href: "#explorer", label: "Explorer" },
] as const;

/**
 * The bar spans the viewport while its contents line up with the centred
 * content column — the padding does that, so no wrapper element is needed.
 */
export function TopNav({ version }: { version: string }) {
  return (
    <nav className="border-line bg-panel sticky top-0 z-50 flex min-h-[50px] items-center border-b px-[max(24px,calc((100%-840px)/2))] max-sm:min-h-[46px] max-sm:px-2">
      <Link
        href="/"
        className="hover:text-accent mr-6 flex-shrink-0 text-[15px] font-extrabold transition-colors max-sm:mr-2 max-sm:text-[13px]"
      >
        Market Analytics
      </Link>

      {SECTIONS.map((section) => (
        <a
          key={section.href}
          href={section.href}
          className="text-muted hover:text-ink h-[50px] px-[18px] text-[15px] leading-[50px] font-semibold whitespace-nowrap transition-colors max-sm:h-[46px] max-sm:px-2 max-sm:text-[13px] max-sm:leading-[46px]"
        >
          {section.label}
        </a>
      ))}

      <span className="border-line bg-panel2 text-muted ml-auto flex-shrink-0 rounded-[20px] border px-2.5 py-0.5 text-[13px] font-semibold">
        {version}
      </span>
    </nav>
  );
}
