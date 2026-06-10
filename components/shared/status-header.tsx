"use client";

import { ArrowDown, Search } from "lucide-react";
import { useEffect, useState } from "react";

import { ProgressRing } from "@/components/shared/progress-ring";

type StatusHeaderProps = {
  /** Exploration progress as an integer 0–100. */
  progress: number;
  /** True once stored session progress has been applied. */
  progressHydrated: boolean;
  /** Receives the palette trigger button, for focus restore on palette close (AR7). */
  paletteTriggerRef: React.RefObject<HTMLButtonElement | null>;
  onOpenPalette: () => void;
};

export function StatusHeader({
  progress,
  progressHydrated,
  paletteTriggerRef,
  onOpenPalette,
}: StatusHeaderProps) {
  // Platform-aware shortcut hint. null until mounted: the server and first
  // client render show an empty fixed-width kbd placeholder (no hydration
  // mismatch, no "Ctrl K" flash on Apple devices, no layout shift), then the
  // detected platform's shortcut fills it in.
  const [isApplePlatform, setIsApplePlatform] = useState<boolean | null>(null);

  useEffect(() => {
    setIsApplePlatform(
      /mac|iphone|ipad|ipod/i.test(window.navigator.platform || window.navigator.userAgent),
    );
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="page-shell flex h-[var(--header-height)] items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="min-w-0">
            <p className="font-[family-name:var(--font-heading)] text-lg font-medium text-foreground md:text-xl">
              Vladyslav Avilov
            </p>
            <p className="text-xs tracking-[0.5px] text-muted-foreground">
              AI Architect
            </p>
          </div>
          <ProgressRing progress={progress} hydrated={progressHydrated} />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            ref={paletteTriggerRef}
            type="button"
            onClick={onOpenPalette}
            // Starts with the visible label "Search" (WCAG 2.5.3 label-in-name);
            // an aria-label is still needed because the text span is display:none
            // on small screens, which would leave the button unnamed.
            aria-label="Search — open command palette"
            aria-keyshortcuts="Control+K Meta+K"
            className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-1.5 text-sm text-foreground-soft transition-[color,background-color,border-color,scale] duration-150 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 hover:bg-secondary hover:text-foreground motion-safe:active:scale-[0.97]"
          >
            <Search aria-hidden="true" className="size-3.5" />
            <span className="hidden sm:inline">Search</span>
            <kbd
              aria-hidden="true"
              className="hidden min-w-12 rounded border border-border bg-background px-1.5 py-0.5 text-center font-sans text-[11px] text-muted-foreground sm:inline-block"
            >
              {isApplePlatform === null
                ? "\u00A0"
                : isApplePlatform
                  ? "⌘K"
                  : "Ctrl\u00A0K"}
            </kbd>
          </button>

          <a
            href="#contact"
            className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-1.5 text-sm text-foreground-soft transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 hover:bg-secondary hover:text-foreground"
          >
            Contacts
            <ArrowDown aria-hidden="true" className="size-3.5" />
          </a>
        </div>
      </div>
    </header>
  );
}
