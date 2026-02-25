"use client";

import { useEffect } from "react";

/**
 * PWARegister — Registers service worker on mount.
 * Placed in root layout so it runs on every page.
 */
export function PWARegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.warn("[PWA] Service worker registration failed:", err);
      });
    }
  }, []);

  return null;
}
