// @vitest-environment happy-dom
import { cleanup, render } from "@testing-library/react";
import { createElement, createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CommandPalette } from "@/components/shared/command-palette";

function renderPalette(onOpenChange: (open: boolean) => void) {
  return render(
    createElement(CommandPalette, {
      open: false,
      onOpenChange,
      askOptions: [{ label: "Show AI work", query: "show ai work" }],
      skillOptions: ["TypeScript"],
      isBusy: false,
      finalFocus: createRef<HTMLElement>(),
      onAsk: () => {},
      onFilterSkill: () => {},
    }),
  );
}

function pressK(modifiers: Partial<KeyboardEventInit>) {
  const event = new KeyboardEvent("keydown", {
    key: "k",
    cancelable: true,
    bubbles: true,
    ...modifiers,
  });
  window.dispatchEvent(event);
  return event;
}

afterEach(cleanup);

describe("CommandPalette global shortcut guard", () => {
  it("toggles on bare Cmd+K and Ctrl+K and prevents the browser default", () => {
    const onOpenChange = vi.fn();
    renderPalette(onOpenChange);

    const meta = pressK({ metaKey: true });
    const ctrl = pressK({ ctrlKey: true });

    expect(onOpenChange).toHaveBeenCalledTimes(2);
    expect(onOpenChange).toHaveBeenNthCalledWith(1, true);
    expect(meta.defaultPrevented).toBe(true);
    expect(ctrl.defaultPrevented).toBe(true);
  });

  it("ignores Shift/Alt-modified chords so browser shortcuts keep working", () => {
    const onOpenChange = vi.fn();
    renderPalette(onOpenChange);

    const shifted = pressK({ ctrlKey: true, shiftKey: true });
    const alted = pressK({ metaKey: true, altKey: true });

    expect(onOpenChange).not.toHaveBeenCalled();
    expect(shifted.defaultPrevented).toBe(false);
    expect(alted.defaultPrevented).toBe(false);
  });

  it("ignores key repeats while the chord is held", () => {
    const onOpenChange = vi.fn();
    renderPalette(onOpenChange);

    pressK({ ctrlKey: true });
    pressK({ ctrlKey: true, repeat: true });
    pressK({ ctrlKey: true, repeat: true });

    expect(onOpenChange).toHaveBeenCalledTimes(1);
  });

  it("ignores plain k presses without a modifier", () => {
    const onOpenChange = vi.fn();
    renderPalette(onOpenChange);

    pressK({});

    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("removes the listener on unmount", () => {
    const onOpenChange = vi.fn();
    const { unmount } = renderPalette(onOpenChange);

    unmount();
    pressK({ ctrlKey: true });

    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
