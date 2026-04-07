"use client";

import type { Components } from "react-markdown";

import { Bot, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";

import { ThoughtTrace, type ThoughtTraceStep } from "@/components/shared/thought-trace";

type ResponsePanelProps = {
  open: boolean;
  response: string;
  isStreaming: boolean;
  steps: ThoughtTraceStep[];
  onClose: () => void;
};

const markdownComponents: Components = {
  p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-[#e3e2de]">{children}</strong>,
  ul: ({ children }) => <ul className="mb-3 ml-4 list-disc space-y-1.5 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-3 ml-4 list-decimal space-y-1.5 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="pl-1">{children}</li>,
  code: ({ children }) => (
    <code className="rounded bg-[#30302e] px-1.5 py-0.5 text-[13px] text-[#c96442]">{children}</code>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-[#c96442] underline underline-offset-2 transition-colors hover:text-[#d97757]"
    >
      {children}
    </a>
  ),
};

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function getFocusableElements(container: HTMLElement | null) {
  if (!container) {
    return [];
  }

  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelector)).filter(
    (element) => !element.hasAttribute("disabled") && element.getAttribute("aria-hidden") !== "true",
  );
}

export function ResponsePanel({
  open,
  response,
  isStreaming,
  steps,
  onClose,
}: ResponsePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [announcedResponse, setAnnouncedResponse] = useState("");

  const handleBackdropClick = useCallback(
    (event: React.MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusableElements = getFocusableElements(panelRef.current);

      if (focusableElements.length === 0) {
        event.preventDefault();
        panelRef.current?.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey) {
        if (activeElement === firstElement || !panelRef.current?.contains(activeElement)) {
          event.preventDefault();
          lastElement.focus();
        }

        return;
      }

      if (!panelRef.current?.contains(activeElement)) {
        event.preventDefault();
        firstElement.focus();
        return;
      }

      if (activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !response) {
      setAnnouncedResponse("");
      return;
    }

    const timeout = window.setTimeout(() => {
      setAnnouncedResponse(response);
    }, isStreaming ? 240 : 0);

    return () => window.clearTimeout(timeout);
  }, [isStreaming, open, response]);

  const isTraceActive = steps.some((s) => s.state === "active" || s.state === "done");

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[60] bg-black/40 transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Panel */}
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Portfolio response"
        aria-hidden={!open}
        inert={!open}
        tabIndex={-1}
        className={`fixed right-0 top-0 z-[70] flex h-full w-full max-w-[600px] flex-col border-l border-[#30302e] bg-[#141413] shadow-[-8px_0_40px_rgba(0,0,0,0.4)] transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "pointer-events-none translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[#30302e] px-6 py-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.5px] text-[#87867f]">
            <Bot aria-hidden="true" className="size-3.5" />
            Portfolio Response
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="rounded p-1.5 text-[#87867f] transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 hover:bg-[#30302e] hover:text-foreground"
            aria-label="Close panel"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-5">
          {isTraceActive && (
            <div className="mb-5 rounded-lg border border-[#30302e] bg-[#30302e]/50 px-4 py-3">
              <ThoughtTrace steps={steps} />
            </div>
          )}

          <div className="sr-only" aria-live="polite" aria-atomic="true">
            {announcedResponse}
          </div>
          <div className="response-prose text-[15px] leading-relaxed text-[#b0aea5]" aria-live="off">
            <Markdown components={markdownComponents}>{response}</Markdown>
            {isStreaming && (
              <span className="ml-1 inline-block size-1.5 animate-pulse rounded-full bg-[#c96442] align-middle" />
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
