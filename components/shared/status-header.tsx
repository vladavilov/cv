import { ArrowDown } from "lucide-react";

export function StatusHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-[#30302e] bg-[#141413]/90 backdrop-blur-md">
      <div className="page-shell flex h-[var(--header-height)] items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="font-[family-name:var(--font-heading)] text-lg font-medium text-foreground md:text-xl">
            Vladyslav Avilov
          </p>
          <p className="text-xs tracking-[0.5px] text-[#87867f]">
            AI Architect
          </p>
        </div>

        <a
          href="#contact"
          className="flex items-center gap-2 rounded-lg border border-[#30302e] bg-[#30302e] px-3 py-1.5 text-sm text-[#b0aea5] transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 hover:bg-[#3d3d3a] hover:text-foreground"
        >
          Contacts
          <ArrowDown aria-hidden="true" className="size-3.5" />
        </a>
      </div>
    </header>
  );
}
