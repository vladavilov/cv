"use client";

import type { Components } from "react-markdown";

import { Bot, ChevronRight, X } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";

import { DISCOVERY_TOAST_SELECTOR } from "@/components/shared/discovery-toast";
import { ThoughtTrace, type ThoughtTraceStep } from "@/components/shared/thought-trace";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBackdrop,
  DialogPopup,
  DialogPortal,
} from "@/components/ui/dialog";
import type { SearchPhase } from "@/lib/experience-search-reducer";
import { cn } from "@/lib/utils";

type ResponsePanelProps = {
  open: boolean;
  response: string;
  phase: SearchPhase;
  isStreaming: boolean;
  steps: ThoughtTraceStep[];
  onClose: () => void;
};

const markdownComponents: Components = {
  p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground-strong">{children}</strong>
  ),
  ul: ({ children }) => <ul className="mb-3 ml-4 list-disc space-y-1.5 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-3 ml-4 list-decimal space-y-1.5 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="pl-1">{children}</li>,
  code: ({ children }) => (
    <code className="rounded bg-muted px-1.5 py-0.5 text-[13px] text-primary">{children}</code>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-primary underline underline-offset-2 transition-colors hover:text-primary-hover"
    >
      {children}
    </a>
  ),
};

export function ResponsePanel({
  open,
  response,
  phase,
  isStreaming,
  steps,
  onClose,
}: ResponsePanelProps) {
  const shouldReduceMotion = useReducedMotion();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [announcedResponse, setAnnouncedResponse] = useState("");
  const [traceExpanded, setTraceExpanded] = useState(false);

  const isComplete = phase === "done" || phase === "fallback";

  // Collapse the disclosure whenever a new search starts.
  useEffect(() => {
    if (!isComplete) {
      setTraceExpanded(false);
    }
  }, [isComplete]);

  // Debounced (240ms while streaming) so AT is not flooded by token-level
  // updates. Deliberately independent of `open`: closing the drawer mid-stream
  // must not swallow the completion announcement.
  useEffect(() => {
    if (!response) {
      setAnnouncedResponse("");
      return;
    }

    const timeout = window.setTimeout(() => {
      setAnnouncedResponse(response);
    }, isStreaming ? 240 : 0);

    return () => window.clearTimeout(timeout);
  }, [isStreaming, response]);

  return (
    <>
      {/* Always-mounted live region: the Dialog popup unmounts when closed,
          so announcements must live outside it. This is the only aria-live
          region for the response, so it cannot double-announce while open. */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcedResponse}
      </div>

      <Dialog
        open={open}
        onOpenChange={(nextOpen, eventDetails) => {
          if (nextOpen) {
            return;
          }
          // The milestone toast sits above the backdrop (z-65 vs z-60) but
          // outside the popup, so Base UI reports presses on it as
          // outside-press. Ignoring those keeps the streamed answer alive
          // when the visitor dismisses a toast; real backdrop presses,
          // Escape, and the close button still close the drawer.
          if (eventDetails.reason === "outside-press") {
            const target = eventDetails.event.target;
            if (
              target instanceof Element &&
              target.closest(DISCOVERY_TOAST_SELECTOR)
            ) {
              eventDetails.cancel();
              return;
            }
          }
          onClose();
        }}
      >
        <DialogPortal>
          <DialogBackdrop />
          <DialogPopup
            variant="drawer-right"
            aria-label="Portfolio response"
            initialFocus={closeButtonRef}
            render={<aside />}
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.5px] text-muted-foreground">
                <Bot aria-hidden="true" className="size-3.5" />
                Portfolio Response
              </div>
              <Button
                ref={closeButtonRef}
                variant="ghost"
                size="icon"
                onClick={onClose}
                aria-label="Close panel"
              >
                <X aria-hidden="true" className="size-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-5">
              {isStreaming && (
                <div className="mb-5 rounded-lg border border-border bg-muted/50 px-4 py-3">
                  <ThoughtTrace steps={steps} />
                </div>
              )}

              {isComplete && (
                <div className="mb-5">
                  <button
                    type="button"
                    aria-expanded={traceExpanded}
                    aria-controls="response-trace-disclosure"
                    onClick={() => setTraceExpanded((expanded) => !expanded)}
                    className="inline-flex items-center gap-1.5 rounded text-xs uppercase tracking-[0.5px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <ChevronRight
                      aria-hidden="true"
                      className={cn(
                        "size-3.5 motion-safe:transition-transform",
                        traceExpanded && "rotate-90",
                      )}
                    />
                    How I Answered
                  </button>
                  {traceExpanded ? (
                    <div
                      id="response-trace-disclosure"
                      className="mt-3 rounded-lg border border-border bg-muted/50 px-4 py-3"
                    >
                      <ThoughtTrace steps={steps} />
                    </div>
                  ) : (
                    <div id="response-trace-disclosure" hidden />
                  )}
                </div>
              )}

              <div
                className="response-prose text-[15px] leading-relaxed text-foreground-soft"
                aria-live="off"
              >
                <Markdown components={markdownComponents}>{response}</Markdown>
                {isStreaming && !shouldReduceMotion ? (
                  <span className="ml-1 inline-block size-1.5 animate-pulse rounded-full bg-primary align-middle" />
                ) : null}
                {isStreaming && shouldReduceMotion ? (
                  <span className="sr-only">Streaming response.</span>
                ) : null}
              </div>
            </div>
          </DialogPopup>
        </DialogPortal>
      </Dialog>
    </>
  );
}
