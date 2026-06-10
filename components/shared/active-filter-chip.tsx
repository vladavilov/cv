"use client";

import { X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { Chip } from "@/components/ui/chip";

type ActiveFilterChipProps = {
  /** Current filter; null renders nothing (and animates the previous chip out). */
  value: string | null;
  onClear: () => void;
};

export function ActiveFilterChip({ value, onClear }: ActiveFilterChipProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <AnimatePresence initial={false}>
      {value ? (
        <motion.div
          key={value}
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.16, ease: "easeOut" }}
          className="shrink-0"
        >
          <Chip
            variant="active"
            render={<button type="button" />}
            onClick={onClear}
            aria-label={`Clear filter: ${value}`}
          >
            {value}
            <X aria-hidden="true" className="size-3.5" />
          </Chip>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
