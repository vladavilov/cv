"use client";

import { Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  Dialog,
  DialogBackdrop,
  DialogPopup,
  DialogPortal,
} from "@/components/ui/dialog";
import { normalizeQueryKey } from "@/lib/exploration";
import { cn } from "@/lib/utils";

export type CommandPaletteAskOption = {
  label: string;
  query: string;
};

type PaletteOption =
  | { kind: "ask"; label: string; query: string }
  | { kind: "skill"; label: string };

type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  askOptions: CommandPaletteAskOption[];
  /** Skill labels that match at least one project (no dead-end graph nodes). */
  skillOptions: string[];
  /** While the search pipeline is busy, "Ask" options are disabled. */
  isBusy: boolean;
  /**
   * Element to focus when the palette closes (the header trigger). The
   * palette can open via ⌘K while focus sits inside the response drawer,
   * which the open mutex unmounts — Base UI's default "previously focused
   * element" restore would then fall to <body> (AR7 violation). Always
   * landing on the trigger is correct for every close path.
   */
  finalFocus: React.RefObject<HTMLElement | null>;
  onAsk: (query: string) => void;
  onFilterSkill: (skill: string) => void;
};

function optionId(index: number) {
  return `command-palette-option-${index}`;
}

/**
 * Cmd/Ctrl+K command palette on the Base UI Dialog (`command` variant).
 *
 * ARIA pattern: combobox-with-listbox via `aria-activedescendant` — the
 * input keeps DOM focus the whole time, ArrowUp/Down move the active
 * `role="option"`, Enter selects, Escape closes (Base UI). Options live in
 * two labelled `role="group"` sections: "Ask" and "Filter by skill".
 */
export function CommandPalette({
  open,
  onOpenChange,
  askOptions,
  skillOptions,
  isBusy,
  finalFocus,
  onAsk,
  onFilterSkill,
}: CommandPaletteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [filterText, setFilterText] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const openRef = useRef(open);
  openRef.current = open;

  // Global shortcut: ⌘K / Ctrl+K toggles the palette from anywhere —
  // including while it is open (pressing it again closes). The parent's
  // onOpenChange enforces the palette↔drawer mutex.
  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      // Bare Cmd/Ctrl+K only: Shift/Alt variants belong to the browser
      // (e.g. Ctrl+Shift+K opens the Firefox console), and ignoring repeats
      // prevents rapid toggling while the chord is held.
      if (
        (event.metaKey || event.ctrlKey) &&
        !event.shiftKey &&
        !event.altKey &&
        !event.repeat &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();
        onOpenChange(!openRef.current);
      }
    };

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [onOpenChange]);

  // Fresh state on every open.
  useEffect(() => {
    if (open) {
      setFilterText("");
      setActiveIndex(0);
    }
  }, [open]);

  const needle = filterText.trim().toLowerCase();

  const visibleAsk = useMemo(
    () =>
      askOptions.filter(
        (option) =>
          !needle ||
          option.label.toLowerCase().includes(needle) ||
          option.query.toLowerCase().includes(needle),
      ),
    [askOptions, needle],
  );

  const visibleSkills = useMemo(
    () =>
      skillOptions.filter(
        (skill) => !needle || skill.toLowerCase().includes(needle),
      ),
    [skillOptions, needle],
  );

  // Free-text search: whatever is typed is always submittable as a query,
  // shown as the first option in the Ask group (routes through the same
  // useExperienceSearch submit as the hero input).
  const askGroupOptions: PaletteOption[] = useMemo(() => {
    const typed = filterText.trim();
    // Dedupe against canonical suggestions with the same normalization as
    // exploration's query keys, so "show me java work" doesn't double up.
    const typedKey = normalizeQueryKey(typed);
    const freeText: PaletteOption[] =
      typed && !visibleAsk.some((option) => normalizeQueryKey(option.query) === typedKey)
        ? [{ kind: "ask", label: "Ask anything", query: typed }]
        : [];

    return [
      ...freeText,
      ...visibleAsk.map((option) => ({ kind: "ask" as const, ...option })),
    ];
  }, [filterText, visibleAsk]);

  const options: PaletteOption[] = useMemo(
    () => [
      ...askGroupOptions,
      ...visibleSkills.map((label) => ({ kind: "skill" as const, label })),
    ],
    [askGroupOptions, visibleSkills],
  );

  const isOptionDisabled = useCallback(
    (option: PaletteOption) => option.kind === "ask" && isBusy,
    [isBusy],
  );

  // Disabled options stay visible (with the busy footer explaining why) but
  // are never the active option: arrows skip them, and when EVERY option is
  // disabled aria-activedescendant comes off the list entirely.
  const enabledIndices = useMemo(
    () =>
      options.flatMap((option, index) => (isOptionDisabled(option) ? [] : [index])),
    [isOptionDisabled, options],
  );

  const resolvedActiveIndex = useMemo(() => {
    if (enabledIndices.length === 0) {
      return -1;
    }
    const clamped = Math.min(activeIndex, options.length - 1);
    if (enabledIndices.includes(clamped)) {
      return clamped;
    }
    // Stored index points at a disabled option (e.g. the pipeline turned
    // busy under it): snap to the next enabled one, wrapping to the first.
    return enabledIndices.find((index) => index > clamped) ?? enabledIndices[0]!;
  }, [activeIndex, enabledIndices, options.length]);

  const activeOption = resolvedActiveIndex >= 0 ? options[resolvedActiveIndex] : undefined;

  // Keep the active option in view while arrowing through a long list.
  useEffect(() => {
    if (!open || resolvedActiveIndex < 0) {
      return;
    }
    listRef.current
      ?.querySelector(`#${optionId(resolvedActiveIndex)}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [open, resolvedActiveIndex]);

  const selectOption = (option: PaletteOption) => {
    if (isOptionDisabled(option)) {
      return;
    }

    if (option.kind === "ask") {
      onAsk(option.query);
    } else {
      onFilterSkill(option.label);
    }
    onOpenChange(false);
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (options.length === 0) {
      return;
    }

    // Navigation moves through ENABLED options only; with everything
    // disabled (streaming + only Ask matches) the arrows are no-ops.
    const position = enabledIndices.indexOf(resolvedActiveIndex);

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (position >= 0) {
          setActiveIndex(enabledIndices[(position + 1) % enabledIndices.length]!);
        }
        break;
      case "ArrowUp":
        event.preventDefault();
        if (position >= 0) {
          setActiveIndex(
            enabledIndices[(position - 1 + enabledIndices.length) % enabledIndices.length]!,
          );
        }
        break;
      case "Home":
        event.preventDefault();
        if (enabledIndices.length > 0) {
          setActiveIndex(enabledIndices[0]!);
        }
        break;
      case "End":
        event.preventDefault();
        if (enabledIndices.length > 0) {
          setActiveIndex(enabledIndices[enabledIndices.length - 1]!);
        }
        break;
      case "Enter":
        event.preventDefault();
        if (activeOption) {
          selectOption(activeOption);
        }
        break;
    }
  };

  const renderOption = (option: PaletteOption, index: number) => {
    const disabled = isOptionDisabled(option);
    const isActive = index === resolvedActiveIndex;

    return (
      <div
        key={`${option.kind}-${option.label}`}
        id={optionId(index)}
        role="option"
        aria-selected={isActive}
        aria-disabled={disabled || undefined}
        onPointerMove={disabled ? undefined : () => setActiveIndex(index)}
        onClick={() => selectOption(option)}
        className={cn(
          "flex cursor-default items-baseline justify-between gap-3 rounded-lg px-3 py-2 text-sm text-foreground-soft",
          isActive && "bg-muted text-foreground",
          disabled && "opacity-50",
          !disabled && "cursor-pointer",
        )}
      >
        <span className="truncate">
          {option.kind === "ask" ? option.query : option.label}
        </span>
        {option.kind === "ask" ? (
          <span className="shrink-0 text-xs text-muted-foreground">{option.label}</span>
        ) : null}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup
          variant="command"
          aria-label="Command palette"
          initialFocus={inputRef}
          finalFocus={finalFocus}
          className="bg-popover"
        >
          <div className="flex items-center gap-2.5 border-b border-border px-4">
            <Search aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              // The popup is visible whenever the palette dialog is open —
              // including the "No matches" state — so expanded mirrors `open`
              // rather than whether any option matched.
              aria-expanded={open}
              aria-autocomplete="list"
              aria-controls="command-palette-listbox"
              aria-activedescendant={
                resolvedActiveIndex >= 0 ? optionId(resolvedActiveIndex) : undefined
              }
              aria-label="Search prompts and skills"
              placeholder="Ask or filter by skill…"
              autoComplete="off"
              spellCheck={false}
              value={filterText}
              onChange={(event) => {
                setFilterText(event.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={handleInputKeyDown}
              className="h-12 w-full bg-transparent text-[15px] text-foreground outline-none placeholder:text-foreground-faint"
            />
          </div>

          {/* The listbox stays mounted (possibly with zero options) so
              aria-controls always references a real element; a listbox may
              only own options/groups, so the "No matches" empty state
              renders as a sibling below it. */}
          <div
            ref={listRef}
            id="command-palette-listbox"
            role="listbox"
            aria-label="Commands"
            className={cn(
              "max-h-[min(50vh,360px)] overflow-y-auto overscroll-contain",
              options.length > 0 && "p-2",
            )}
          >
            {askGroupOptions.length > 0 ? (
              <div role="group" aria-labelledby="command-palette-group-ask">
                <p
                  id="command-palette-group-ask"
                  role="presentation"
                  className="px-3 pb-1 pt-2 text-xs uppercase tracking-[0.5px] text-muted-foreground"
                >
                  Ask
                </p>
                {askGroupOptions.map((option, index) => renderOption(option, index))}
              </div>
            ) : null}

            {visibleSkills.length > 0 ? (
              <div role="group" aria-labelledby="command-palette-group-skills">
                <p
                  id="command-palette-group-skills"
                  role="presentation"
                  className="px-3 pb-1 pt-2 text-xs uppercase tracking-[0.5px] text-muted-foreground"
                >
                  Filter by skill
                </p>
                {visibleSkills.map((label, index) =>
                  renderOption({ kind: "skill", label }, askGroupOptions.length + index),
                )}
              </div>
            ) : null}
          </div>

          {options.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              No matches.
            </p>
          ) : null}

          {isBusy ? (
            <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
              Answer in progress — asking is paused, skill filters stay available.
            </p>
          ) : null}
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
}
