"use client";

import { useEffect, useRef } from "react";

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
 * By default skips events in input/textarea/contenteditable.
 * Pass `allowInEditable: true` on a binding to opt out of this filter.
 *
 * Uses a ref internally so the bindings array doesn't need to be stable.
 *
 * Usage:
 *   useHotkeys([
 *     { combo: { key: "k", meta: true }, handler: () => openSearch() },
 *     { combo: { key: "Enter", meta: true }, handler: () => submitForm(), allowInEditable: true },
 *   ]);
 */
export function useHotkeys(
  bindings: { combo: KeyCombo; handler: HotkeyHandler; allowInEditable?: boolean }[]
) {
  // Use ref to always read the latest bindings without re-attaching the listener
  const bindingsRef = useRef(bindings);
  bindingsRef.current = bindings;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      const isEditable =
        tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" ||
        (e.target as HTMLElement)?.isContentEditable;

      for (const { combo, handler, allowInEditable } of bindingsRef.current) {
        // Skip editable elements unless explicitly allowed
        if (isEditable && !allowInEditable) continue;

        // Modifier matching — if specified, require it; if not, require absence
        const modKey = combo.meta || combo.ctrl;
        const modMatch = modKey ? (e.metaKey || e.ctrlKey) : !(e.metaKey || e.ctrlKey);
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
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);
}
