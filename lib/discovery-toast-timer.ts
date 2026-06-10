/**
 * Auto-dismiss countdown for the discovery toast (accessibility req 8).
 *
 * Hover and focus are tracked as INDEPENDENT pause sources: the countdown
 * runs only while neither is active. This is what makes a pointer
 * pass-through safe — pointer leave cannot resume the timer while the
 * dismiss button still holds keyboard focus, and blurring the button cannot
 * resume it while the pointer still rests on the toast. Pausing preserves
 * the remaining time, so the toast never auto-dismisses earlier than the
 * visitor expects after an interaction.
 *
 * Pure timer logic (window.setTimeout/Date.now only) so it is unit-testable
 * with fake timers; the React wiring lives in
 * `components/shared/discovery-toast.tsx`.
 */
export type DiscoveryToastTimer = {
  /** (Re)starts the full countdown and clears both pause sources. */
  start: () => void;
  /** Stops the countdown without dismissing (unmount/toast-replaced cleanup). */
  cancel: () => void;
  setHovered: (hovered: boolean) => void;
  setFocused: (focused: boolean) => void;
};

export function createDiscoveryToastTimer(
  durationMs: number,
  onDismiss: () => void,
): DiscoveryToastTimer {
  let timerId: ReturnType<typeof setTimeout> | null = null;
  let remainingMs = durationMs;
  let startedAt = 0;
  let hovered = false;
  let focused = false;

  const clear = () => {
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
  };

  const pause = () => {
    if (timerId === null) {
      return;
    }
    remainingMs = Math.max(0, remainingMs - (Date.now() - startedAt));
    clear();
  };

  /** Restarts the countdown only once BOTH hover and focus have ended. */
  const maybeResume = () => {
    if (hovered || focused || timerId !== null) {
      return;
    }
    startedAt = Date.now();
    timerId = setTimeout(onDismiss, remainingMs);
  };

  return {
    start: () => {
      clear();
      hovered = false;
      focused = false;
      remainingMs = durationMs;
      startedAt = Date.now();
      timerId = setTimeout(onDismiss, durationMs);
    },
    cancel: clear,
    setHovered: (next) => {
      hovered = next;
      if (next) {
        pause();
      } else {
        maybeResume();
      }
    },
    setFocused: (next) => {
      focused = next;
      if (next) {
        pause();
      } else {
        maybeResume();
      }
    },
  };
}
