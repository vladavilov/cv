import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createDiscoveryToastTimer } from "@/lib/discovery-toast-timer";

const DURATION = 5000;

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

function makeTimer() {
  const onDismiss = vi.fn();
  const timer = createDiscoveryToastTimer(DURATION, onDismiss);
  return { timer, onDismiss };
}

describe("createDiscoveryToastTimer", () => {
  it("dismisses exactly once after the full duration when untouched", () => {
    const { timer, onDismiss } = makeTimer();
    timer.start();

    vi.advanceTimersByTime(DURATION - 1);
    expect(onDismiss).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(DURATION * 2);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("pauses on hover and resumes with the remaining time, not a fresh countdown", () => {
    const { timer, onDismiss } = makeTimer();
    timer.start();

    vi.advanceTimersByTime(2000);
    timer.setHovered(true);

    // Paused: arbitrarily long hovers never dismiss.
    vi.advanceTimersByTime(DURATION * 3);
    expect(onDismiss).not.toHaveBeenCalled();

    timer.setHovered(false);

    // 3000ms were left when the pause started.
    vi.advanceTimersByTime(2999);
    expect(onDismiss).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("stays paused after hover out while focus is still held (hover in → focus in → hover out)", () => {
    const { timer, onDismiss } = makeTimer();
    timer.start();

    vi.advanceTimersByTime(1000);
    timer.setHovered(true);
    timer.setFocused(true);
    timer.setHovered(false);

    // Focus alone must keep the countdown paused — the toast can never
    // auto-unmount while focus is inside it.
    vi.advanceTimersByTime(DURATION * 3);
    expect(onDismiss).not.toHaveBeenCalled();

    // Both sources clear → resumes and dismisses after the remaining 4000ms.
    timer.setFocused(false);
    vi.advanceTimersByTime(3999);
    expect(onDismiss).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("stays paused after blur while the pointer still rests on the toast (focus in → hover in → focus out)", () => {
    const { timer, onDismiss } = makeTimer();
    timer.start();

    timer.setFocused(true);
    timer.setHovered(true);
    timer.setFocused(false);

    vi.advanceTimersByTime(DURATION * 3);
    expect(onDismiss).not.toHaveBeenCalled();

    timer.setHovered(false);
    vi.advanceTimersByTime(DURATION);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("cancel stops the countdown without dismissing", () => {
    const { timer, onDismiss } = makeTimer();
    timer.start();
    timer.cancel();

    vi.advanceTimersByTime(DURATION * 3);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("start resets remaining time and pause sources for a replacing toast", () => {
    const { timer, onDismiss } = makeTimer();
    timer.start();
    timer.setHovered(true);

    // A newer toast restarts the countdown even though the old one was
    // hover-paused; the stale hover flag must not block the new timer.
    timer.start();
    vi.advanceTimersByTime(DURATION);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
