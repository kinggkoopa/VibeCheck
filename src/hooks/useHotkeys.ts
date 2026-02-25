"use client";

import { useEffect, useCallback } from "react";

type KeyCombo = {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
};

type HotkeyHandler = (e: KeyboardEvent) => void;

/**
 * useHotkeys — Register keyboard shortcuts.
 *
 * Supports Cmd/Ctrl normalization (uses Meta on Mac, Ctrl on others).
 * Ignores events when focus is in input/textarea/contenteditable.
 *
 * Usage:
 *   useHotkeys([
 *     { combo: { key: "k", meta: true }, handler: () => openSearch() },
 *     { combo: { key: "Enter", meta: true }, handler: () => submitForm() },
 *     { combo: { key: "/", meta: true }, handler: () => toggleHelp() },
 *   ]);
 */
export function useHotkeys(
  bindings: { combo: KeyCombo; handler: HotkeyHandler }[]
) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Skip if focus is in an editable element
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if ((e.target as HTMLElement)?.isContentEditable) return;

      for (const { combo, handler } of bindings) {
        const modKey = combo.meta || combo.ctrl;
        const modMatch = modKey ? e.metaKey || e.ctrlKey : true;
        const shiftMatch = combo.shift ? e.shiftKey : !e.shiftKey;
        const altMatch = combo.alt ? e.altKey : !e.altKey;

        if (
          e.key.toLowerCase() === combo.key.toLowerCase() &&
          modMatch &&
          shiftMatch &&
          altMatch
        ) {
          e.preventDefault();
          handler(e);
          return;
        }
      }
    },
    [bindings]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
