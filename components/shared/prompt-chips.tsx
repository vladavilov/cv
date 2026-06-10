"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

import { Chip } from "@/components/ui/chip";

type PromptChip = {
  label: string;
  query: string;
};

type PromptChipsProps = {
  chips: PromptChip[];
  /** True once the stored exploration session has been restored (see use-exploration). */
  hydrated: boolean;
  onSelect: (query: string) => void;
  disabled?: boolean;
};

export function PromptChips({
  chips,
  hydrated,
  onSelect,
  disabled = false,
}: PromptChipsProps) {
  const shouldReduceMotion = useReducedMotion();
  // Arm the layout animation only after the hydration restore has painted
  // (same double-rAF approach as progress-ring): restoring a stored session
  // re-ranks the chips, and that one-frame-after-load reorder must apply
  // silently — only re-ranks from live query completions animate.
  const [reorderArmed, setReorderArmed] = useState(false);

  useEffect(() => {
    if (!hydrated || reorderArmed) {
      return;
    }
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setReorderArmed(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [hydrated, reorderArmed]);

  const animateReorder = reorderArmed && !shouldReduceMotion;

  return (
    <div className="flex flex-wrap gap-2">
      {/* Keys are the suggestion query: stable across adaptive re-ranking,
          so reorders animate via layout instead of remounting. Chips that
          cross the top-5 window boundary enter/exit with a brief fade+scale
          (popLayout keeps the survivors' layout animation smooth around the
          leaver); both are instant until armed / under reduced motion. */}
      <AnimatePresence mode="popLayout" initial={false}>
        {chips.map((chip) => (
          <motion.div
            key={chip.query}
            layout={animateReorder ? "position" : false}
            initial={animateReorder ? { opacity: 0, scale: 0.92 } : false}
            animate={{ opacity: 1, scale: 1 }}
            exit={animateReorder ? { opacity: 0, scale: 0.92 } : { opacity: 0 }}
            transition={{ duration: animateReorder ? 0.25 : 0, ease: "easeOut" }}
          >
            <Chip
              render={<button type="button" disabled={disabled} />}
              onClick={() => onSelect(chip.query)}
            >
              {chip.label}
            </Chip>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
