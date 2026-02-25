"use client";

/**
 * Push Notification helpers — Client-side.
 *
 * Handles:
 * - Service worker registration
 * - Push subscription management
 * - Local notification fallback (Notification API)
 */

/** Register the service worker and request notification permissions. */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });
    return registration;
  } catch (err) {
    console.warn("[push-notify] SW registration failed:", err);
    return null;
  }
}

/** Request notification permission. */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }

  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;

  const result = await Notification.requestPermission();
  return result === "granted";
}

/** Show a local notification (doesn't require push subscription). */
export function showLocalNotification(
  title: string,
  options?: {
    body?: string;
    tag?: string;
    url?: string;
  }
): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const notification = new Notification(title, {
    body: options?.body,
    icon: "/icon-192.png",
    tag: options?.tag ?? "metavibe-local",
  });

  if (options?.url) {
    notification.onclick = () => {
      window.focus();
      window.location.href = options.url!;
    };
  }
}

/** Check if the app is running as an installed PWA. */
export function isPWA(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    ("standalone" in window.navigator &&
      (window.navigator as unknown as { standalone: boolean }).standalone)
  );
}
