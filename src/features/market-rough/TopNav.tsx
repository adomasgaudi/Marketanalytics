import Link from "next/link";

import { VersionButton } from "./VersionButton";

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
    <nav className="border-line bg-panel sticky top-0 z-50 border-b">
      <div className="mx-auto flex h-[50px] w-full max-w-[840px] items-center px-6 max-sm:h-[46px] max-sm:px-2">
        <Link
          href="/"
          className="hover:text-accent mr-4 flex-shrink-0 text-[15px] font-extrabold transition-colors max-sm:mr-2 max-sm:text-[13px]"
        >
          Market Analytics
        </Link>

        {SECTIONS.map((section) => (
          <a
            key={section.href}
            href={section.href}
            className="text-muted hover:text-ink h-[50px] px-4 text-[15px] leading-[50px] font-semibold whitespace-nowrap transition-colors max-sm:h-[46px] max-sm:px-2 max-sm:text-[13px] max-sm:leading-[46px]"
          >
            {section.label}
          </a>
        ))}

        <Link
          href="/ugly"
          className="text-muted hover:text-ink mr-3 ml-auto h-[50px] px-4 text-[15px] leading-[50px] font-semibold whitespace-nowrap transition-colors max-sm:h-[46px] max-sm:px-2 max-sm:text-[13px] max-sm:leading-[46px]"
        >
          Ugly
        </Link>

        <VersionButton version={version} />
      </div>
    </nav>
  );
}
