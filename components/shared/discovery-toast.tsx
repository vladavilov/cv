"use client";

import { X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";

import type { ExplorationToast } from "@/hooks/use-exploration";
import {
  createDiscoveryToastTimer,
  type DiscoveryToastTimer,
} from "@/lib/discovery-toast-timer";

const AUTO_DISMISS_MS = 5000;

/**
 * Marks the toast region so modal surfaces layered beneath it (the response
 * drawer) can recognize presses inside the toast and ignore them as
 * outside-press dismissals. See ResponsePanel's onOpenChange.
 */
export const DISCOVERY_TOAST_SELECTOR = "[data-discovery-toast]";

type DiscoveryToastProps = {
  /** Single slot: a newer toast replaces the visible one (queue length 1). */
  toast: ExplorationToast | null;
  onDismiss: () => void;
};

/**
 * Quiet milestone toast, bottom-center. The live region container is
 * always mounted (aria-live="polite" aria-atomic="true") and the toast text
 * is injected into it, so milestones announce without interrupting the
 * response stream announcement (milestones derive from terminal phases).
 * The 5s auto-dismiss timer runs only while the toast is NEITHER hovered
 * NOR focused (independent pause sources — see lib/discovery-toast-timer);
 * in particular the toast can never auto-unmount while focus is inside it,
 * which would drop focus to <body>.
 * Layering: z-[65] — above the response drawer backdrop (z-[60]) so a toast
 * fired while the drawer is open stays undimmed and interactive (hover
 * pause, dismiss button), but below the dialog popup (z-[70]) so the modal
 * surface itself still wins the stack.
 */
export function DiscoveryToast({ toast, onDismiss }: DiscoveryToastProps) {
  const shouldReduceMotion = useReducedMotion();

  const timerRef = useRef<DiscoveryToastTimer | null>(null);

  // A fresh timer per toast id; replacing or removing the toast cancels it.
  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = createDiscoveryToastTimer(AUTO_DISMISS_MS, onDismiss);
    timerRef.current = timer;
    timer.start();
    return () => {
      timer.cancel();
      timerRef.current = null;
    };
  }, [onDismiss, toast]);

  return (
    <div
      data-discovery-toast=""
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed inset-x-0 bottom-5 z-[65] flex justify-center px-4"
    >
      <AnimatePresence>
        {toast ? (
          <motion.div
            key={toast.id}
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.2, ease: "easeOut" }}
            onPointerEnter={() => timerRef.current?.setHovered(true)}
            onPointerLeave={() => timerRef.current?.setHovered(false)}
            onFocus={() => timerRef.current?.setFocused(true)}
            onBlur={(event) => {
              // Focus moving between children of the toast is not an exit.
              if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
                return;
              }
              timerRef.current?.setFocused(false);
            }}
            className="pointer-events-auto flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-2.5 shadow-lg"
          >
            <p className="text-sm text-foreground-soft">{toast.message}</p>
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Dismiss"
              className="rounded p-1 text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 hover:bg-muted hover:text-foreground"
            >
              <X aria-hidden="true" className="size-3.5" />
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
