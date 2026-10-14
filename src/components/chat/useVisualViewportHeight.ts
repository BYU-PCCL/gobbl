"use client";

import { useEffect } from "react";

/**
 * Keeps a `--vvh` CSS variable on <html> equal to the visual viewport height, and holds the
 * page scrolled to the top, for as long as `enabled` is true.
 *
 * Full-height chat screens size their column with `h-[var(--vvh,100dvh)]`. When the on-screen
 * keyboard opens the visual viewport shrinks, so the column shrinks with it and the composer
 * stays above the keyboard with the newest messages visible. Android Chrome already resizes
 * the layout viewport for us (interactive-widget=resizes-content in app/layout.tsx); iOS
 * Safari never does, and instead pans the page to reveal the focused input. This hook is for
 * iOS, and is harmless elsewhere: with no keyboard, `--vvh` simply equals 100dvh.
 */
export function useVisualViewportHeight(enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const vv = window.visualViewport;
    if (!vv) return;
    const root = document.documentElement;

    const update = () => {
      root.style.setProperty("--vvh", `${Math.round(vv.height)}px`);
      // Undo iOS panning the document so the column stays anchored at the top.
      if (window.scrollY !== 0) window.scrollTo(0, 0);
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      root.style.removeProperty("--vvh");
    };
  }, [enabled]);
}
