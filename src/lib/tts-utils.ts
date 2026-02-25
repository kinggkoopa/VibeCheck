/**
 * TTS Utilities — Text-to-Speech for MetaVibeCoder.
 *
 * Uses Web Speech Synthesis API for browser-based TTS.
 * Provides voice selection, rate/pitch control, and playback management.
 *
 * Client-side only — no "server-only" directive.
 */

export interface TTSConfig {
  voice: string;      // Voice name or "default"
  rate: number;       // 0.1 - 10 (default: 1.0)
  pitch: number;      // 0 - 2 (default: 1.0)
  autoSpeak: boolean; // Auto-speak results
}

const DEFAULT_CONFIG: TTSConfig = {
  voice: "default",
  rate: 1.0,
  pitch: 1.0,
  autoSpeak: false,
};

/** Check if TTS is available in the current browser. */
export function isTTSAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Get available TTS voices, grouped by language. */
export function getVoices(): SpeechSynthesisVoice[] {
  if (!isTTSAvailable()) return [];
  return window.speechSynthesis.getVoices();
}

/** Get English voices sorted by quality (local > remote). */
export function getEnglishVoices(): SpeechSynthesisVoice[] {
  return getVoices()
    .filter((v) => v.lang.startsWith("en"))
    .sort((a, b) => {
      // Prefer local voices (higher quality)
      if (a.localService && !b.localService) return -1;
      if (!a.localService && b.localService) return 1;
      return a.name.localeCompare(b.name);
    });
}

/** Find a voice by name, falling back to first English voice. */
export function resolveVoice(name: string): SpeechSynthesisVoice | null {
  const voices = getVoices();
  if (name !== "default") {
    const match = voices.find((v) => v.name === name);
    if (match) return match;
  }
  // Fallback: first English voice, or system default
  return voices.find((v) => v.lang.startsWith("en")) ?? voices[0] ?? null;
}

/**
 * Speak text using Web Speech Synthesis.
 * Returns a controller object with pause/resume/stop.
 */
export function speak(
  text: string,
  config: Partial<TTSConfig> = {},
  callbacks?: {
    onStart?: () => void;
    onEnd?: () => void;
    onPause?: () => void;
    onResume?: () => void;
    onWord?: (charIndex: number, charLength: number) => void;
    onError?: (error: string) => void;
  }
): TTSController {
  const merged = { ...DEFAULT_CONFIG, ...config };

  if (!isTTSAvailable()) {
    callbacks?.onError?.("Text-to-speech is not available in this browser.");
    return createNoopController();
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = Math.max(0.1, Math.min(10, merged.rate));
  utterance.pitch = Math.max(0, Math.min(2, merged.pitch));

  const voice = resolveVoice(merged.voice);
  if (voice) utterance.voice = voice;

  utterance.onstart = () => callbacks?.onStart?.();
  utterance.onend = () => callbacks?.onEnd?.();
  utterance.onpause = () => callbacks?.onPause?.();
  utterance.onresume = () => callbacks?.onResume?.();
  utterance.onerror = (e) => callbacks?.onError?.(e.error);

  utterance.onboundary = (e) => {
    if (e.name === "word") {
      callbacks?.onWord?.(e.charIndex, e.charLength);
    }
  };

  window.speechSynthesis.speak(utterance);

  return {
    pause: () => window.speechSynthesis.pause(),
    resume: () => window.speechSynthesis.resume(),
    stop: () => window.speechSynthesis.cancel(),
    get speaking() {
      return window.speechSynthesis.speaking;
    },
    get paused() {
      return window.speechSynthesis.paused;
    },
  };
}

export interface TTSController {
  pause: () => void;
  resume: () => void;
  stop: () => void;
  readonly speaking: boolean;
  readonly paused: boolean;
}

function createNoopController(): TTSController {
  return {
    pause: () => {},
    resume: () => {},
    stop: () => {},
    get speaking() { return false; },
    get paused() { return false; },
  };
}

/**
 * Load TTS config from user settings API.
 */
export async function loadTTSConfig(): Promise<TTSConfig> {
  try {
    const res = await fetch("/api/tts-config");
    if (!res.ok) return DEFAULT_CONFIG;
    const data = await res.json();
    return data.data ?? DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
}

/**
 * Save TTS config to user settings API.
 */
export async function saveTTSConfig(config: Partial<TTSConfig>): Promise<void> {
  await fetch("/api/tts-config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
}

/**
 * Clean text for TTS — strip markdown, code blocks, and excessive formatting.
 */
export function cleanTextForTTS(text: string): string {
  return text
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, "Code block omitted.")
    // Remove inline code
    .replace(/`([^`]+)`/g, "$1")
    // Remove markdown headers
    .replace(/^#+\s*/gm, "")
    // Remove markdown bold/italic
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    // Remove links but keep text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Remove bullet points
    .replace(/^[-*]\s*/gm, "")
    // Collapse multiple newlines
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
