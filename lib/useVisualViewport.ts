"use client";

import { useEffect, useState } from "react";

export type VisualViewportLayout = {
  /** Pixels of layout viewport covered by the on-screen keyboard (approx). */
  keyboardOpen: boolean;
  /** Height of the visible viewport — use for the chat shell. */
  height: number | null;
  /** Offset from the top of the layout viewport to the visual viewport. */
  offsetTop: number;
};

/**
 * Track the visual viewport so chat UIs can shrink to the area above the
 * keyboard instead of fighting `position: fixed` + manual bottom offsets.
 */
export function useVisualViewport(): VisualViewportLayout {
  const [layout, setLayout] = useState<VisualViewportLayout>({
    keyboardOpen: false,
    height: null,
    offsetTop: 0,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const vv = window.visualViewport;
    if (!vv) {
      setLayout({
        keyboardOpen: false,
        height: window.innerHeight,
        offsetTop: 0,
      });
      return;
    }

    const update = () => {
      // Treat a meaningful shrink vs layout viewport as "keyboard open".
      const covered = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setLayout({
        keyboardOpen: covered > 80,
        height: vv.height,
        offsetTop: vv.offsetTop,
      });
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    window.addEventListener("orientationchange", update);

    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return layout;
}
