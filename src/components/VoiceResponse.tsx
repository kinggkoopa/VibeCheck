"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  isTTSAvailable,
  getEnglishVoices,
  type TTSController,
  type TTSConfig,
} from "@/lib/tts-utils";
import { speakNatural, getAriaAttributes, getProgressPercent } from "@/lib/tts-engine";

/**
 * VoiceResponse — Text-to-Speech output component.
 *
 * Reads AI analysis results aloud with:
 * - Play/pause/stop controls
 * - Text highlighting as spoken
 * - Voice, rate, pitch settings
 * - Auto-speak toggle
 */

interface VoiceResponseProps {
  /** The text to speak */
  text: string;
  /** Auto-speak when text changes */
  autoSpeak?: boolean;
  /** Compact mode — just the play button */
  compact?: boolean;
}

export function VoiceResponse({ text, autoSpeak = false, compact = false }: VoiceResponseProps) {
  const [available, setAvailable] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [highlightIndex, setHighlightIndex] = useState(-1);

  const [config, setConfig] = useState<TTSConfig>({
    voice: "default",
    rate: 1.0,
    pitch: 1.0,
    autoSpeak: autoSpeak,
  });

  const controllerRef = useRef<TTSController | null>(null);

  // Check TTS availability and load voices
  useEffect(() => {
    const ok = isTTSAvailable();
    setAvailable(ok);
    if (!ok) return;

    function loadVoices() {
      setVoices(getEnglishVoices());
    }

    loadVoices();
    // Voices load async in some browsers
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Auto-speak when text changes
  useEffect(() => {
    if (config.autoSpeak && text && available) {
      handleSpeak();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, config.autoSpeak]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      controllerRef.current?.stop();
    };
  }, []);

  const handleSpeak = useCallback(() => {
    if (!text) return;

    controllerRef.current = speakNatural(text, config, {
      onStart: () => {
        setSpeaking(true);
        setPaused(false);
      },
      onEnd: () => {
        setSpeaking(false);
        setPaused(false);
        setHighlightIndex(-1);
      },
      onPause: () => setPaused(true),
      onResume: () => setPaused(false),
      onChunk: () => {},
      onWord: (charIndex) => setHighlightIndex(charIndex),
      onError: () => {
        setSpeaking(false);
        setPaused(false);
      },
    });
  }, [text, config]);

  const handlePause = useCallback(() => {
    controllerRef.current?.pause();
  }, []);

  const handleResume = useCallback(() => {
    controllerRef.current?.resume();
  }, []);

  const handleStop = useCallback(() => {
    controllerRef.current?.stop();
    setSpeaking(false);
    setPaused(false);
    setHighlightIndex(-1);
  }, []);

  if (!available) return null;

  if (compact) {
    return (
      <button
        onClick={speaking ? handleStop : handleSpeak}
        className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-surface-elevated"
        title={speaking ? "Stop speaking" : "Speak results"}
      >
        {speaking ? (
          <>
            <StopIcon />
            Stop
          </>
        ) : (
          <>
            <SpeakerIcon />
            Speak
          </>
        )}
      </button>
    );
  }

  return (
    <div className="space-y-3">
      {/* ── Controls ── */}
      <div className="flex items-center gap-2">
        {!speaking ? (
          <button
            onClick={handleSpeak}
            disabled={!text}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
          >
            <SpeakerIcon />
            Speak Results
          </button>
        ) : (
          <>
            <button
              onClick={paused ? handleResume : handlePause}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-surface-elevated"
            >
              {paused ? <PlayIcon /> : <PauseIcon />}
              {paused ? "Resume" : "Pause"}
            </button>
            <button
              onClick={handleStop}
              className="flex items-center gap-1.5 rounded-lg border border-danger/30 px-3 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger/5"
            >
              <StopIcon />
              Stop
            </button>
          </>
        )}

        {/* Settings toggle */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="ml-auto rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted transition-colors hover:bg-surface-elevated"
        >
          {showSettings ? "Hide" : "Voice"} Settings
        </button>

        {/* Auto-speak toggle */}
        <label className="flex items-center gap-1.5 text-xs text-muted">
          <input
            type="checkbox"
            checked={config.autoSpeak}
            onChange={(e) => setConfig({ ...config, autoSpeak: e.target.checked })}
            className="rounded border-border"
          />
          Auto
        </label>
      </div>

      {/* ── Speaking indicator with ARIA ── */}
      {speaking && (
        <div className="space-y-2" {...getAriaAttributes(speaking, paused)}>
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5">
              <div className="h-3 w-1 animate-pulse rounded-full bg-primary" style={{ animationDelay: "0ms" }} />
              <div className="h-3 w-1 animate-pulse rounded-full bg-primary" style={{ animationDelay: "150ms" }} />
              <div className="h-3 w-1 animate-pulse rounded-full bg-primary" style={{ animationDelay: "300ms" }} />
            </div>
            <span className="text-xs text-primary-light">
              {paused ? "Paused" : "Speaking..."}
            </span>
            {highlightIndex >= 0 && (
              <span className="text-xs text-muted">
                {getProgressPercent(highlightIndex, text.length)}%
              </span>
            )}
          </div>
          {/* Progress bar */}
          {highlightIndex >= 0 && (
            <div className="h-1 w-full overflow-hidden rounded-full bg-surface-elevated">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${getProgressPercent(highlightIndex, text.length)}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* ── Settings Panel ── */}
      {showSettings && (
        <div className="rounded-lg border border-border bg-surface-elevated p-4 space-y-3">
          {/* Voice selector */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Voice</label>
            <select
              value={config.voice}
              onChange={(e) => setConfig({ ...config, voice: e.target.value })}
              className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm focus:border-primary focus:outline-none"
            >
              <option value="default">System Default</option>
              {voices.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.name} {v.localService ? "(local)" : "(network)"}
                </option>
              ))}
            </select>
          </div>

          {/* Rate slider */}
          <div>
            <label className="mb-1 flex items-center justify-between text-xs font-medium text-muted">
              <span>Rate</span>
              <span>{config.rate.toFixed(1)}x</span>
            </label>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.1"
              value={config.rate}
              onChange={(e) => setConfig({ ...config, rate: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>

          {/* Pitch slider */}
          <div>
            <label className="mb-1 flex items-center justify-between text-xs font-medium text-muted">
              <span>Pitch</span>
              <span>{config.pitch.toFixed(1)}</span>
            </label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={config.pitch}
              onChange={(e) => setConfig({ ...config, pitch: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── SVG Icons ──

function SpeakerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <rect x="3" y="3" width="18" height="18" rx="2" />
    </svg>
  );
}
