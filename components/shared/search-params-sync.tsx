"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

type SearchParamsSyncProps = {
  onParamsChange: (q: string, skill: string) => void;
};

/**
 * Renders nothing; exists so `useSearchParams` lives behind its own Suspense
 * boundary. Wrapping only this leaf keeps the rest of the page statically
 * prerendered instead of bailing the whole tree out to client rendering.
 * Re-fires on every searchParams change, which covers initial load and
 * back/forward navigation.
 */
export function SearchParamsSync({ onParamsChange }: SearchParamsSyncProps) {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const skill = searchParams.get("skill") ?? "";

  useEffect(() => {
    onParamsChange(q, skill);
  }, [onParamsChange, q, skill]);

  return null;
}
