/**
 * Runtime access to the design tokens defined in `app/globals.css` for code
 * that cannot use Tailwind classes (canvas drawing, `<meta theme-color>`).
 *
 * This is the ONLY place where theme hex values may appear outside of
 * `globals.css` `:root`. The constants below mirror the token definitions and
 * act as SSR/initial-paint fallbacks.
 */

export const themeColorFallbacks = {
  background: "#141413",
  foreground: "#faf9f5",
  primary: "#c96442",
  accentForeground: "#d97757",
  mutedForeground: "#87867f",
  foregroundSoft: "#b0aea5",
  foregroundFaint: "#5e5d59",
} as const;

export type ThemeColorToken = keyof typeof themeColorFallbacks;

export const tokenToCssVariable: Record<ThemeColorToken, string> = {
  background: "--background",
  foreground: "--foreground",
  primary: "--primary",
  accentForeground: "--accent-foreground",
  mutedForeground: "--muted-foreground",
  foregroundSoft: "--foreground-soft",
  foregroundFaint: "--foreground-faint",
};

/** Resolves a theme token to its current CSS custom property value. */
export function getThemeColor(token: ThemeColorToken): string {
  if (typeof window === "undefined") {
    return themeColorFallbacks[token];
  }

  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(tokenToCssVariable[token])
    .trim();

  return value || themeColorFallbacks[token];
}

/**
 * Applies an alpha channel to a `#rrggbb` color. Pure — safe to call during
 * render. Returns the input unchanged for non-hex values.
 */
export function withAlpha(color: string, alpha: number): string {
  const hexMatch = /^#([0-9a-fA-F]{6})$/.exec(color);

  if (!hexMatch) {
    return color;
  }

  const r = parseInt(hexMatch[1].slice(0, 2), 16);
  const g = parseInt(hexMatch[1].slice(2, 4), 16);
  const b = parseInt(hexMatch[1].slice(4, 6), 16);

  return `rgba(${r},${g},${b},${alpha})`;
}