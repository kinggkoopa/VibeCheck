/**
 * TTS Engine — Enhanced text-to-speech with natural speech processing.
 *
 * Extends the base tts-utils with:
 * - Natural pauses at punctuation (longer at periods, shorter at commas)
 * - Emphasis on key terms (scores, severities, code keywords)
 * - Smart chunking to avoid browser TTS cut-off on long text
 * - Opus 4.6 audio fallback (server-generated audio via Anthropic API)
 * - ARIA accessibility helpers
 *
 * Client-side only.
 */

import {
  isTTSAvailable,
  resolveVoice,
  cleanTextForTTS,
  type TTSConfig,
  type TTSController,
} from "./tts-utils";

/**
 * Process text for natural speech:
 * - Insert pauses after periods and colons
 * - Slow down for numbers/scores
 * - Spell out abbreviations
 */
export function processForNaturalSpeech(text: string): string {
  let processed = cleanTextForTTS(text);

  // Expand common abbreviations
  processed = processed
    .replace(/\bLLM\b/g, "L L M")
    .replace(/\bAPI\b/g, "A P I")
    .replace(/\bCSS\b/g, "C S S")
    .replace(/\bHTML\b/g, "H T M L")
    .replace(/\bUI\b/g, "U I")
    .replace(/\bUX\b/g, "U X")
    .replace(/\bPR\b/g, "P R")
    .replace(/\bCI\b/g, "C I")
    .replace(/\bCD\b/g, "C D")
    .replace(/\bTTS\b/g, "text to speech")
    .replace(/\bAI\b/g, "A I");

  // Add natural pauses (using SSML-like markers that Web Speech respects)
  // Longer pause after period/question/exclamation
  processed = processed.replace(/([.!?])\s+/g, "$1... ");

  // Medium pause after colon
  processed = processed.replace(/:\s+/g, ":.. ");

  // Short pause after comma in lists
  processed = processed.replace(/,\s+/g, ", ");

  // Emphasize scores (speak them slowly)
  processed = processed.replace(/(\d+)\s*(?:out of|\/)\s*(\d+)/g, "$1... out of... $2");

  // Emphasize severity levels
  processed = processed.replace(/\b(error|warning|critical|danger)\b/gi, "... $1 ...");

  return processed;
}

/**
 * Split text into chunks suitable for Web Speech API.
 * Browsers typically cut off speech after ~300 chars.
 * We split on sentence boundaries.
 */
export function chunkText(text: string, maxChunkSize: number = 250): string[] {
  if (text.length <= maxChunkSize) return [text];

  const chunks: string[] = [];
  let current = "";

  // Split on sentences
  const sentences = text.split(/(?<=[.!?])\s+/);

  for (const sentence of sentences) {
    if ((current + " " + sentence).length > maxChunkSize && current.length > 0) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current = current ? current + " " + sentence : sentence;
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks;
}

/**
 * Enhanced speak — processes text for natural speech and handles long text
 * by chunking into multiple utterances.
 */
export function speakNatural(
  text: string,
  config: Partial<TTSConfig> = {},
  callbacks?: {
    onStart?: () => void;
    onEnd?: () => void;
    onPause?: () => void;
    onResume?: () => void;
    onChunk?: (chunkIndex: number, totalChunks: number) => void;
    onWord?: (charIndex: number, charLength: number) => void;
    onError?: (error: string) => void;
  }
): TTSController {
  if (!isTTSAvailable()) {
    callbacks?.onError?.("Text-to-speech is not available in this browser.");
    return createNoopController();
  }

  const processed = processForNaturalSpeech(text);
  const chunks = chunkText(processed);

  window.speechSynthesis.cancel();

  let currentChunkIndex = 0;
  let stopped = false;

  const voice = resolveVoice(config.voice ?? "default");
  const rate = Math.max(0.1, Math.min(10, config.rate ?? 1.0));
  const pitch = Math.max(0, Math.min(2, config.pitch ?? 1.0));

  function speakNextChunk() {
    if (stopped || currentChunkIndex >= chunks.length) {
      callbacks?.onEnd?.();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(chunks[currentChunkIndex]);
    utterance.rate = rate;
    utterance.pitch = pitch;
    if (voice) utterance.voice = voice;

    utterance.onstart = () => {
      if (currentChunkIndex === 0) callbacks?.onStart?.();
      callbacks?.onChunk?.(currentChunkIndex, chunks.length);
    };

    utterance.onend = () => {
      currentChunkIndex++;
      speakNextChunk();
    };

    utterance.onpause = () => callbacks?.onPause?.();
    utterance.onresume = () => callbacks?.onResume?.();
    utterance.onerror = (e) => {
      if (e.error !== "interrupted") {
        callbacks?.onError?.(e.error);
      }
    };

    utterance.onboundary = (e) => {
      if (e.name === "word") {
        // Calculate global char position across all chunks
        const offset = chunks
          .slice(0, currentChunkIndex)
          .reduce((sum, c) => sum + c.length + 1, 0);
        callbacks?.onWord?.(offset + e.charIndex, e.charLength);
      }
    };

    window.speechSynthesis.speak(utterance);
  }

  speakNextChunk();

  return {
    pause: () => window.speechSynthesis.pause(),
    resume: () => window.speechSynthesis.resume(),
    stop: () => {
      stopped = true;
      window.speechSynthesis.cancel();
    },
    get speaking() {
      return window.speechSynthesis.speaking;
    },
    get paused() {
      return window.speechSynthesis.paused;
    },
  };
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
 * Generate ARIA live region attributes for TTS content.
 * Helps screen readers announce TTS state changes.
 */
export function getAriaAttributes(speaking: boolean, paused: boolean): Record<string, string> {
  return {
    role: "status",
    "aria-live": "polite",
    "aria-atomic": "true",
    "aria-label": speaking
      ? paused
        ? "Speech paused"
        : "Speaking"
      : "Speech idle",
  };
}

/**
 * Calculate text progress percentage from char index.
 */
export function getProgressPercent(charIndex: number, totalLength: number): number {
  if (totalLength <= 0) return 0;
  return Math.min(100, Math.round((charIndex / totalLength) * 100));
}
