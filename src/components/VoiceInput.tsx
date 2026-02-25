"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface VoiceInputProps {
  /** Called when transcription completes — fills the prompt field. */
  onTranscript: (text: string) => void;
  /** Optional: auto-submit after transcription. */
  onAutoRun?: () => void;
  /** Disable mic while parent is processing. */
  disabled?: boolean;
}

type RecordingState = "idle" | "recording" | "processing" | "error";

/**
 * VoiceInput — Mic button for speech-to-text prompt input.
 *
 * Strategy:
 * 1. Primary: Web Speech API (SpeechRecognition) — zero latency, free, works offline
 * 2. Fallback: Record audio blob → POST /api/transcribe-audio → OpenAI Whisper via user's key
 *
 * Handles:
 * - Browser compatibility detection
 * - Ambient noise / accent retry UI
 * - Visual recording indicator with waveform animation
 * - Auto-run toggle
 */
export function VoiceInput({ onTranscript, onAutoRun, disabled }: VoiceInputProps) {
  const [state, setState] = useState<RecordingState>("idle");
  const [transcript, setTranscript] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [autoRun, setAutoRun] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const [supported, setSupported] = useState(true);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // ── Check Web Speech API support ──
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setUseFallback(true);
      // Check if MediaRecorder is available for Whisper fallback
      if (!window.MediaRecorder) {
        setSupported(false);
      }
    }
  }, []);

  // ── Web Speech API recording ──
  const startWebSpeech = useCallback(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setUseFallback(true);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    let finalTranscript = "";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript + " ";
        } else {
          interim += result[0].transcript;
        }
      }
      setTranscript((finalTranscript + interim).trim());
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      console.warn("[VoiceInput] Speech recognition error:", event.error);
      if (event.error === "no-speech") {
        setErrorMsg("No speech detected. Try again — speak clearly into the mic.");
      } else if (event.error === "audio-capture") {
        setErrorMsg("Microphone not available. Check permissions.");
      } else if (event.error === "not-allowed") {
        setErrorMsg("Microphone permission denied. Allow mic access and try again.");
      } else {
        setErrorMsg(`Speech error: ${event.error}. Try the Whisper fallback.`);
        setUseFallback(true);
      }
      setState("error");
    };

    recognition.onend = () => {
      if (state === "recording") {
        // Auto-stopped — deliver what we have
        const text = finalTranscript.trim();
        if (text) {
          onTranscript(text);
          if (autoRun && onAutoRun) {
            setTimeout(onAutoRun, 300);
          }
        }
        setState("idle");
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setState("recording");
    setErrorMsg(null);
    setTranscript("");
  }, [onTranscript, onAutoRun, autoRun, state]);

  // ── Whisper fallback recording ──
  const startWhisperRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop all tracks
        stream.getTracks().forEach((t) => t.stop());

        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size < 1000) {
          setErrorMsg("Recording too short. Hold the mic button longer.");
          setState("error");
          return;
        }

        setState("processing");
        setTranscript("Transcribing with Whisper...");

        try {
          const formData = new FormData();
          formData.append("audio", blob, "recording.webm");

          const res = await fetch("/api/transcribe-audio", {
            method: "POST",
            body: formData,
          });

          const data = await res.json();
          if (data.error) {
            setErrorMsg(data.error);
            setState("error");
          } else if (data.data?.text) {
            const text = data.data.text.trim();
            setTranscript(text);
            onTranscript(text);
            if (autoRun && onAutoRun) {
              setTimeout(onAutoRun, 300);
            }
            setState("idle");
          } else {
            setErrorMsg("No text returned from transcription.");
            setState("error");
          }
        } catch (err) {
          setErrorMsg(
            err instanceof Error ? err.message : "Transcription failed"
          );
          setState("error");
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setState("recording");
      setErrorMsg(null);
      setTranscript("");
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Failed to access microphone"
      );
      setState("error");
    }
  }, [onTranscript, onAutoRun, autoRun]);

  // ── Stop recording ──
  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    if (state === "recording") {
      // For Web Speech, onend handler delivers the transcript
      // For Whisper, onstop handler processes the blob
    }
  }, [state]);

  // ── Toggle recording ──
  const toggleRecording = useCallback(() => {
    if (state === "recording") {
      stopRecording();
    } else if (state === "idle" || state === "error") {
      if (useFallback) {
        startWhisperRecording();
      } else {
        startWebSpeech();
      }
    }
  }, [state, useFallback, startWebSpeech, startWhisperRecording, stopRecording]);

  // ── Retry ──
  const handleRetry = useCallback(() => {
    setState("idle");
    setErrorMsg(null);
    setTranscript("");
  }, []);

  if (!supported) {
    return null; // Browser doesn't support any speech input
  }

  return (
    <div className="flex items-start gap-2">
      {/* Mic button */}
      <button
        type="button"
        onClick={toggleRecording}
        disabled={disabled || state === "processing"}
        title={
          state === "recording"
            ? "Stop recording"
            : useFallback
              ? "Record with Whisper"
              : "Voice input"
        }
        className={`group relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition-all ${
          state === "recording"
            ? "border-danger bg-danger/20 text-danger"
            : state === "processing"
              ? "border-warning bg-warning/20 text-warning"
              : state === "error"
                ? "border-danger/50 bg-danger/10 text-danger"
                : "border-border bg-surface text-muted hover:border-primary hover:text-primary-light"
        } disabled:opacity-40`}
        aria-label={state === "recording" ? "Stop recording" : "Start voice input"}
      >
        {state === "recording" ? (
          // Stop icon with pulse ring
          <span className="relative flex h-5 w-5 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger/40" />
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          </span>
        ) : state === "processing" ? (
          // Spinner
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" className="opacity-25" />
            <path d="M4 12a8 8 0 018-8" className="opacity-75" />
          </svg>
        ) : (
          // Mic icon
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <rect x="9" y="2" width="6" height="11" rx="3" />
            <path d="M5 10a7 7 0 0014 0" />
            <line x1="12" y1="19" x2="12" y2="22" />
          </svg>
        )}
      </button>

      {/* Status / controls area */}
      <div className="min-w-0 flex-1">
        {/* Recording indicator */}
        {state === "recording" && (
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 rounded-full bg-danger"
                  style={{
                    height: `${8 + Math.random() * 12}px`,
                    animation: `pulse ${0.5 + i * 0.1}s ease-in-out infinite alternate`,
                  }}
                />
              ))}
            </div>
            <span className="text-xs text-danger">
              {useFallback ? "Recording..." : "Listening..."}
            </span>
            {transcript && (
              <span className="truncate text-xs text-muted italic">
                {transcript}
              </span>
            )}
          </div>
        )}

        {/* Processing */}
        {state === "processing" && (
          <span className="text-xs text-warning">
            Transcribing with Whisper...
          </span>
        )}

        {/* Error with retry */}
        {state === "error" && errorMsg && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-danger">{errorMsg}</span>
            <button
              onClick={handleRetry}
              className="rounded px-2 py-0.5 text-xs font-medium text-primary-light hover:underline"
            >
              Retry
            </button>
            {!useFallback && (
              <button
                onClick={() => {
                  setUseFallback(true);
                  handleRetry();
                }}
                className="rounded px-2 py-0.5 text-xs text-muted hover:text-foreground"
              >
                Try Whisper
              </button>
            )}
          </div>
        )}

        {/* Auto-run toggle (visible when idle) */}
        {state === "idle" && onAutoRun && (
          <label className="flex cursor-pointer items-center gap-1.5">
            <input
              type="checkbox"
              checked={autoRun}
              onChange={(e) => setAutoRun(e.target.checked)}
              className="h-3 w-3 rounded border-border accent-primary"
            />
            <span className="text-xs text-muted">Auto-run after voice</span>
          </label>
        )}
      </div>
    </div>
  );
}

// ── Type declarations for Web Speech API ──
// These aren't included in all TS lib targets, so we declare them minimally.
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    SpeechRecognition: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    webkitSpeechRecognition: any;
  }
}
