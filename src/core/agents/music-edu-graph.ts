import { StateGraph, Annotation } from "@langchain/langgraph";
import { complete } from "@/core/llm/provider";
import { injectMemoryContext } from "@/db/memory";
import type { LLMProvider } from "@/types";

/**
 * Music Education Agent Swarm — LangGraph
 *
 * Multi-agent swarm for vibe-coding music education apps and tools.
 *
 * Flow:
 *   __start__ → [theory-analyzer, instrument-simulator] (parallel)
 *       ↓
 *   theory-analyzer → composition-generator (needs theory first)
 *   instrument-simulator → lesson-builder (needs instruments for exercises)
 *       ↓
 *   composition-generator → supervisor
 *   lesson-builder → supervisor
 *       ↓
 *   supervisor → [math-harmonics, monetization-advisor] (parallel)
 *       ↓
 *   math-harmonics → assembler
 *   monetization-advisor → assembler
 *       ↓
 *   assembler → (iterate or finalize)
 *
 * Sub-agents:
 * - Theory Analyzer: Music theory expert — scales, chords, progressions, intervals
 * - Composition Generator: Algorithmic composition and MIDI data generation
 * - Lesson Builder: Interactive music education pedagogy and lesson plans
 * - Instrument Simulator: Virtual instrument interface configurations
 * - Math Harmonics: Frequency calculations, harmonic series, waveform math
 * - Monetization Advisor: Freemium, subscriptions, course marketplace strategy
 * - Supervisor: Merges outputs, validates theory-composition consistency
 * - Assembler: Produces final MusicEduReport
 */

// ── Sub-agent system prompts ──

const MUSIC_EDU_PROMPTS = {
  "theory-analyzer": `You are an expert music theory analyst specializing in music education.
Analyze the user's music education concept and identify all required theory concepts.

Your expertise covers:
- Chord analysis: triads, sevenths, extensions, inversions, slash chords
- Progressions: I-IV-V-I (pop/rock), ii-V-I (jazz), I-vi-IV-V (50s), vi-IV-I-V (modern pop), 12-bar blues
- Scales: major, natural/harmonic/melodic minor, all 7 modes (dorian, phrygian, lydian, mixolydian, aeolian, locrian), pentatonic (major/minor), blues, whole-tone, chromatic
- Intervals: unison through octave, consonance vs dissonance, just intonation vs equal temperament
- Key signatures: all major and minor keys, circle of fifths relationships, relative/parallel keys
- Time signatures: simple (2/4, 3/4, 4/4), compound (6/8, 9/8, 12/8), odd meters (5/4, 7/8)
- Circle of fifths: key relationships, modulation pathways, dominant/subdominant motion

Return your analysis as JSON:
{
  "agent": "theory-analyzer",
  "concepts": [
    {
      "name": "<e.g. Major Scale>",
      "category": "scale|chord|progression|rhythm|interval|key",
      "description": "<educational explanation>",
      "notation": "<music notation reference>",
      "difficulty": "beginner|intermediate|advanced"
    }
  ],
  "learning_path": ["<ordered concept sequence>"],
  "prerequisites": ["<what student should know>"],
  "summary": "<2-3 sentences>"
}
Return ONLY valid JSON, no markdown fences.`,

  "composition-generator": `You are an expert in algorithmic music composition and MIDI data generation.
Given music theory concepts, generate MIDI-compatible data structures for educational compositions.

Generate:
1. Melody generators using the identified scales and modes
2. Chord progression sequences with proper voice leading
3. Rhythm patterns with varying complexity levels
4. Bass lines following root motion and walking bass patterns
5. Arpeggios demonstrating chord tones and extensions

Use standard MIDI conventions:
- Note names (C4, D#5) or MIDI numbers (60, 63)
- Durations: whole, half, quarter, eighth, sixteenth, dotted variants, triplets
- Velocity: 0-127 (pp=32, p=48, mp=64, mf=80, f=96, ff=112)
- General MIDI instrument programs (0=Acoustic Grand Piano, etc.)

Return your compositions as JSON:
{
  "agent": "composition-generator",
  "compositions": [
    {
      "name": "<piece name>",
      "tempo_bpm": 120,
      "time_signature": "4/4",
      "key": "C major",
      "tracks": [
        {
          "name": "<e.g. melody>",
          "instrument": "<GM instrument name>",
          "notes": [
            { "pitch": "<MIDI note or name>", "duration": "quarter", "velocity": 80 }
          ]
        }
      ]
    }
  ],
  "midi_generation_code": "<TypeScript code for generating MIDI file data>",
  "summary": "<description>"
}
Return ONLY valid JSON, no markdown fences.`,

  "lesson-builder": `You are an expert in interactive music education pedagogy.
Create structured lesson plans with interactive exercises for music education apps.

Design lessons with:
1. Clear learning objectives aligned with music theory concepts
2. Progressive explanations building from known to unknown
3. Interactive exercises: ear training, note identification, rhythm clapping, chord recognition
4. Quizzes: multiple choice, note matching, interval identification, chord quality recognition
5. Practice activities: play-along exercises, composition prompts, improvisation guides
6. Progress tracking: skill levels, completion percentages, mastery indicators

Exercise types:
- note-input: Student plays or selects specific notes
- chord-select: Student identifies or builds chords
- rhythm-tap: Student taps rhythms matching notation
- ear-training: Student identifies intervals, chords, or melodies by ear
- fretboard-click: Student identifies notes on guitar fretboard

Return your lesson plans as JSON:
{
  "agent": "lesson-builder",
  "lessons": [
    {
      "title": "<lesson title>",
      "level": "beginner|intermediate|advanced",
      "objectives": ["<learning goal>"],
      "sections": [
        {
          "type": "explanation|exercise|quiz|practice",
          "content": "<instruction text>",
          "interactive_config": {
            "type": "note-input|chord-select|rhythm-tap|ear-training|fretboard-click",
            "correct_answer": "<answer>",
            "hints": ["<hint>"]
          }
        }
      ],
      "estimated_minutes": 15
    }
  ],
  "quiz_bank": [
    {
      "question": "<q>",
      "options": ["<opt>"],
      "correct": 0,
      "explanation": "<why>"
    }
  ],
  "summary": "<overview>"
}
Return ONLY valid JSON, no markdown fences.`,

  "instrument-simulator": `You are an expert in virtual instrument interface design for music education.
Generate configurations for interactive virtual instrument UIs.

Design interfaces for:
1. Piano keyboard: 88-key or configurable range, touch/click note triggering, key highlighting for scales/chords, sustain pedal simulation
2. Guitar fretboard: 6-string standard tuning (or configurable), fret markers, finger position guides, chord diagrams, tab display
3. Drum pad: GM drum map, velocity-sensitive pads, pattern sequencer, metronome integration
4. Staff/notation display: Treble/bass/alto clef, note rendering, real-time notation input, playback cursor

Include:
- Touch/click input mapping for each key, fret position, or pad
- Sound triggering configuration (which MIDI note, velocity response)
- Visual feedback: key highlighting, note animations, correct/incorrect indicators
- Responsive layout descriptions for mobile and desktop

Return your instrument configurations as JSON:
{
  "agent": "instrument-simulator",
  "instruments": [
    {
      "type": "piano|guitar|drums|staff",
      "config": {
        "range": "<e.g. C3-C6>",
        "layout": "<visual layout description>",
        "input_map": [
          { "key_or_position": "<identifier>", "note": "<MIDI note>", "label": "<display>" }
        ],
        "visual_feedback": "<description>"
      }
    }
  ],
  "audio_config": {
    "sample_library": "<recommended sample library>",
    "synthesis_type": "sample|oscillator|hybrid"
  },
  "summary": "<overview>"
}
Return ONLY valid JSON, no markdown fences.`,

  "math-harmonics": `You are a music mathematics and acoustics specialist.
Validate and generate precise music math for education and audio processing.

Calculate and verify:
1. Frequency calculations: A4=440Hz, equal temperament formula f = 440 * 2^((n-69)/12)
2. Harmonic series: fundamental frequency and its integer multiples (overtones)
3. Beat frequencies: |f1 - f2| for tuning and interference patterns
4. Interval ratios: just intonation (3:2 perfect fifth, 4:3 perfect fourth) vs equal temperament
5. Waveform math: sine waves, square waves (odd harmonics), sawtooth (all harmonics), triangle waves
6. Fourier transform references for audio spectrum analysis
7. Decibel calculations: dB = 20 * log10(A/A_ref) for amplitude, sound intensity levels
8. Tempo/rhythm math: BPM to milliseconds, subdivision timing, swing ratios

Return your calculations as JSON:
{
  "agent": "math-harmonics",
  "calculations": [
    {
      "name": "<e.g. Equal Temperament Formula>",
      "formula": "<math expression>",
      "explanation": "<what it does>",
      "implementation": "<TypeScript code>",
      "verified": true
    }
  ],
  "frequency_table": [
    { "note": "<e.g. A4>", "frequency_hz": 440.0, "midi_number": 69 }
  ],
  "harmonic_analysis": {
    "overtone_series": ["<description of overtone relationships>"],
    "consonance_ranking": ["<interval: ratio>"]
  },
  "summary": "<overview>"
}
Return ONLY valid JSON, no markdown fences.`,

  "monetization-advisor": `You are a music education platform monetization strategist.
Analyze the music education concept for revenue potential and business model design.

Evaluate:
1. Freemium Model: Free lessons for basic concepts, premium for advanced theory, ear training, and instrument packs
2. Subscription Tiers: Monthly/annual plans for progressive access to content and features
3. Course Marketplace: User-generated or curated courses, instructor revenue share
4. Premium Instrument Packs: Additional virtual instruments, sound libraries, MIDI export
5. Certification/Badges: Achievement system, skill certificates, gamification elements
6. API Integrations: Spotify API for song analysis, Apple Music for practice-along, YouTube for lesson embedding
7. B2B/Education: School/institution licenses, classroom management, progress reporting
8. Content Partnerships: Music publisher deals, artist collaboration, branded courses

Return your monetization strategy as JSON:
{
  "agent": "monetization-advisor",
  "model": "freemium|subscription|course-marketplace",
  "tiers": [
    {
      "name": "<tier name>",
      "price": "<price>",
      "features": ["<feature>"]
    }
  ],
  "content_strategy": "<how to create and curate educational content>",
  "platform_suggestions": ["<where to deploy>"],
  "estimated_revenue": "<revenue projection and assumptions>",
  "summary": "<overview>"
}
Return ONLY valid JSON, no markdown fences.`,
} as const;

const MUSIC_EDU_SUPERVISOR_PROMPT = `You are the Music Education supervisor. You coordinate analysis from the theory analyzer,
composition generator, lesson builder, and instrument simulator to ensure a cohesive, educational music app.

Your job:
1. Verify theory-composition consistency: compositions use correct scales, chords match declared key signatures, progressions follow music theory rules
2. Check lesson-instrument alignment: lessons reference instruments that are configured, exercises use valid note ranges within instrument configs
3. Validate exercise correctness: quiz answers are musically accurate, ear training exercises use proper intervals
4. Ensure progressive difficulty: lessons build on each other, beginner concepts precede advanced ones
5. Flag any theory errors: incorrect interval names, wrong scale degrees, invalid chord voicings
6. Check MIDI data validity: note values within range (0-127), velocities valid, durations reasonable
7. Determine if iteration is needed to fix issues

Return your merged analysis as JSON:
{
  "consistency_check": {
    "theory_composition_valid": true,
    "lesson_instrument_aligned": true,
    "exercise_accuracy": true,
    "progressive_difficulty": true,
    "issues": ["<any issues found>"]
  },
  "fixes_applied": ["<description of fix>"],
  "quality_notes": ["<suggestion for improvement>"],
  "needs_iteration": false,
  "summary": "<2-3 sentence consistency assessment>"
}
Return ONLY valid JSON, no markdown fences.`;

// ── Types ──

export interface MusicConcept {
  name: string;
  category: "scale" | "chord" | "progression" | "rhythm" | "interval" | "key";
  description: string;
  notation: string;
  difficulty: "beginner" | "intermediate" | "advanced";
}

export interface MusicTrackNote {
  pitch: string;
  duration: string;
  velocity: number;
}

export interface MusicTrack {
  name: string;
  instrument: string;
  notes: MusicTrackNote[];
}

export interface MusicComposition {
  name: string;
  tempo_bpm: number;
  time_signature: string;
  key: string;
  tracks: MusicTrack[];
}

export interface LessonSection {
  type: "explanation" | "exercise" | "quiz" | "practice";
  content: string;
  interactive_config?: {
    type: "note-input" | "chord-select" | "rhythm-tap" | "ear-training" | "fretboard-click";
    correct_answer: string;
    hints: string[];
  };
}

export interface MusicLesson {
  title: string;
  level: "beginner" | "intermediate" | "advanced";
  objectives: string[];
  sections: LessonSection[];
  estimated_minutes: number;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

export interface InstrumentInputMapping {
  key_or_position: string;
  note: string;
  label: string;
}

export interface InstrumentConfig {
  type: "piano" | "guitar" | "drums" | "staff";
  config: {
    range: string;
    layout: string;
    input_map: InstrumentInputMapping[];
    visual_feedback: string;
  };
}

export interface HarmonicCalculation {
  name: string;
  formula: string;
  explanation: string;
  implementation: string;
  verified: boolean;
}

export interface FrequencyEntry {
  note: string;
  frequency_hz: number;
  midi_number: number;
}

export interface MusicEduScore {
  theory_depth: number;
  interactivity: number;
  audio_quality: number;
  pedagogy: number;
  engagement: number;
  overall: number;
}

export interface MonetizationTier {
  name: string;
  price: string;
  features: string[];
}

export interface MonetizationData {
  model: string;
  tiers: MonetizationTier[];
  content_strategy: string;
  platform_suggestions: string[];
  estimated_revenue: string;
}

export interface MusicEduReport {
  concepts: MusicConcept[];
  compositions: MusicComposition[];
  lessons: MusicLesson[];
  instruments: InstrumentConfig[];
  mathAnalysis: {
    calculations: HarmonicCalculation[];
    frequency_table: FrequencyEntry[];
    harmonic_analysis: {
      overtone_series: string[];
      consonance_ranking: string[];
    };
  };
  midiCode: string;
  musicEduScore: MusicEduScore;
  monetization: MonetizationData;
  quizBank: QuizQuestion[];
  learningPath: string[];
  prerequisites: string[];
  consistencyCheck: {
    theory_composition_valid: boolean;
    lesson_instrument_aligned: boolean;
    exercise_accuracy: boolean;
    progressive_difficulty: boolean;
    issues: string[];
    quality_notes: string[];
  };
  verdict: string;
}

export interface MusicEduMessage {
  agent: string;
  content: string;
  timestamp: string;
  parsedData?: Record<string, unknown>;
}

export interface MusicEduResult {
  report: MusicEduReport;
  messages: MusicEduMessage[];
  iterations: number;
  provider: string;
}

// ── LangGraph State ──

const MusicEduAnnotation = Annotation.Root({
  /** The user's music education idea */
  idea: Annotation<string>,

  /** Focus area for the education app */
  focusArea: Annotation<string>({
    reducer: (_, v) => v,
    default: () => "full-app",
  }),

  /** Target difficulty level */
  difficulty: Annotation<string>({
    reducer: (_, v) => v,
    default: () => "beginner",
  }),

  /** Individual agent outputs (accumulated) */
  agentMessages: Annotation<MusicEduMessage[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),

  /** Raw JSON responses from each specialist */
  specialistResults: Annotation<Record<string, string>>({
    reducer: (prev, next) => ({ ...prev, ...next }),
    default: () => ({}),
  }),

  /** Supervisor's merged consistency check */
  supervisorResult: Annotation<string>({
    reducer: (_, v) => v,
    default: () => "",
  }),

  /** Final assembled report */
  musicEduReport: Annotation<MusicEduReport | null>({
    reducer: (_, v) => v,
    default: () => null,
  }),

  /** Current iteration */
  iteration: Annotation<number>({ reducer: (_, v) => v, default: () => 0 }),

  /** Max iterations */
  maxIterations: Annotation<number>({ reducer: (_, v) => v, default: () => 2 }),

  /** Current phase */
  status: Annotation<string>({
    reducer: (_, v) => v,
    default: () => "building" as const,
  }),
});

type MusicEduState = typeof MusicEduAnnotation.State;

// ── Retry with backoff ──

async function completeWithRetry(
  provider: LLMProvider,
  systemPrompt: string,
  userMessage: string,
  options?: { temperature?: number; maxTokens?: number },
  maxRetries: number = 3
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await complete(provider, systemPrompt, userMessage, options);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries - 1) {
        const backoff = Math.pow(2, attempt) * 1000;
        await new Promise((r) => setTimeout(r, backoff));
      }
    }
  }

  throw lastError ?? new Error("Max retries exceeded");
}

// ── Provider resolution ──

const PROVIDER_ORDER: LLMProvider[] = ["anthropic", "openrouter", "openai", "groq"];

async function resolveProvider(): Promise<LLMProvider> {
  for (const p of PROVIDER_ORDER) {
    try {
      await complete(p, "Reply with OK", "test", { maxTokens: 5 });
      return p;
    } catch {
      continue;
    }
  }
  throw new Error("No working API key found. Add one in Settings.");
}

// ── Specialist node factory ──

function createMusicEduSpecialistNode(
  agentName: keyof typeof MUSIC_EDU_PROMPTS,
  provider: LLMProvider
) {
  return async (state: MusicEduState): Promise<Partial<MusicEduState>> => {
    const systemPrompt = await injectMemoryContext(
      MUSIC_EDU_PROMPTS[agentName],
      state.idea
    );

    let userContext: string;

    if (agentName === "composition-generator") {
      userContext = `Music Education Idea: ${state.idea}\nFocus: ${state.focusArea}\nDifficulty: ${state.difficulty}\n\nTheory Analysis:\n${state.specialistResults["theory-analyzer"] ?? "N/A"}\n\nGenerate compositions that teach and demonstrate the identified theory concepts.`;
    } else if (agentName === "lesson-builder") {
      userContext = `Music Education Idea: ${state.idea}\nFocus: ${state.focusArea}\nDifficulty: ${state.difficulty}\n\nTheory Analysis:\n${state.specialistResults["theory-analyzer"] ?? "N/A"}\n\nInstrument Configurations:\n${state.specialistResults["instrument-simulator"] ?? "N/A"}\n\nCreate lessons that use the available instruments for interactive exercises.`;
    } else if (agentName === "math-harmonics") {
      userContext = `Music Education Idea: ${state.idea}\nFocus: ${state.focusArea}\n\nTheory Concepts:\n${state.specialistResults["theory-analyzer"] ?? "N/A"}\n\nCompositions:\n${state.specialistResults["composition-generator"] ?? "N/A"}\n\nSupervisor Notes:\n${state.supervisorResult || "N/A"}\n\nValidate all frequency math, interval ratios, and provide implementation code.`;
    } else if (agentName === "monetization-advisor") {
      userContext = `Music Education Idea: ${state.idea}\nFocus: ${state.focusArea}\nDifficulty: ${state.difficulty}\n\nTheory Concepts:\n${state.specialistResults["theory-analyzer"] ?? "N/A"}\n\nLessons:\n${state.specialistResults["lesson-builder"] ?? "N/A"}\n\nInstruments:\n${state.specialistResults["instrument-simulator"] ?? "N/A"}\n\nSupervisor Notes:\n${state.supervisorResult || "N/A"}`;
    } else {
      const difficultyHint = state.difficulty ? `\nTarget Difficulty: ${state.difficulty}` : "";
      const focusHint = state.focusArea ? `\nFocus Area: ${state.focusArea}` : "";
      userContext = `Design a music education app/tool based on this idea:\n\n${state.idea}${focusHint}${difficultyHint}`;
    }

    const result = await completeWithRetry(
      provider,
      systemPrompt,
      userContext,
      { temperature: 0.3, maxTokens: 8192 }
    );

    const message: MusicEduMessage = {
      agent: agentName,
      content: result,
      timestamp: new Date().toISOString(),
    };

    try {
      const cleaned = result.replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
      message.parsedData = JSON.parse(cleaned);
    } catch {
      message.parsedData = { raw: result.slice(0, 500) };
    }

    return {
      agentMessages: [message],
      specialistResults: { [agentName]: result },
    };
  };
}

// ── Supervisor merge node ──

function createMusicEduSupervisorNode(provider: LLMProvider) {
  return async (state: MusicEduState): Promise<Partial<MusicEduState>> => {
    const specialistOutputs = Object.entries(state.specialistResults)
      .filter(([key]) => ["theory-analyzer", "composition-generator", "lesson-builder", "instrument-simulator"].includes(key))
      .map(([agent, result]) => `=== ${agent.toUpperCase()} ===\n${result}`)
      .join("\n\n");

    const result = await completeWithRetry(
      provider,
      MUSIC_EDU_SUPERVISOR_PROMPT,
      `Music Education Idea: ${state.idea}\nFocus: ${state.focusArea}\nDifficulty: ${state.difficulty}\n\nSpecialist Outputs:\n${specialistOutputs}`,
      { temperature: 0.2, maxTokens: 4096 }
    );

    return {
      supervisorResult: result,
      agentMessages: [{
        agent: "supervisor",
        content: result,
        timestamp: new Date().toISOString(),
      }],
    };
  };
}

// ── Final report assembler ──

function createMusicEduAssemblerNode() {
  return async (state: MusicEduState): Promise<Partial<MusicEduState>> => {
    // Parse theory analyzer
    let concepts: MusicConcept[] = [];
    let learningPath: string[] = [];
    let prerequisites: string[] = [];
    try {
      const cleaned = (state.specialistResults["theory-analyzer"] ?? "")
        .replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
      const data = JSON.parse(cleaned);
      concepts = data.concepts ?? [];
      learningPath = data.learning_path ?? [];
      prerequisites = data.prerequisites ?? [];
    } catch { /* use defaults */ }

    // Parse composition generator
    let compositions: MusicComposition[] = [];
    let midiCode = "";
    try {
      const cleaned = (state.specialistResults["composition-generator"] ?? "")
        .replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
      const data = JSON.parse(cleaned);
      compositions = data.compositions ?? [];
      midiCode = data.midi_generation_code ?? "";
    } catch { /* use defaults */ }

    // Parse lesson builder
    let lessons: MusicLesson[] = [];
    let quizBank: QuizQuestion[] = [];
    try {
      const cleaned = (state.specialistResults["lesson-builder"] ?? "")
        .replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
      const data = JSON.parse(cleaned);
      lessons = data.lessons ?? [];
      quizBank = data.quiz_bank ?? [];
    } catch { /* use defaults */ }

    // Parse instrument simulator
    let instruments: InstrumentConfig[] = [];
    let audioConfig = { sample_library: "Web Audio API", synthesis_type: "hybrid" };
    try {
      const cleaned = (state.specialistResults["instrument-simulator"] ?? "")
        .replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
      const data = JSON.parse(cleaned);
      instruments = data.instruments ?? [];
      audioConfig = data.audio_config ?? audioConfig;
    } catch { /* use defaults */ }

    // Parse math harmonics
    let calculations: HarmonicCalculation[] = [];
    let frequencyTable: FrequencyEntry[] = [];
    let harmonicAnalysis = { overtone_series: [] as string[], consonance_ranking: [] as string[] };
    try {
      const cleaned = (state.specialistResults["math-harmonics"] ?? "")
        .replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
      const data = JSON.parse(cleaned);
      calculations = data.calculations ?? [];
      frequencyTable = data.frequency_table ?? [];
      harmonicAnalysis = data.harmonic_analysis ?? harmonicAnalysis;
    } catch { /* use defaults */ }

    // Parse monetization advisor
    let monetization: MonetizationData = {
      model: "freemium",
      tiers: [],
      content_strategy: "",
      platform_suggestions: [],
      estimated_revenue: "",
    };
    try {
      const cleaned = (state.specialistResults["monetization-advisor"] ?? "")
        .replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
      const data = JSON.parse(cleaned);
      monetization = {
        model: data.model ?? "freemium",
        tiers: data.tiers ?? [],
        content_strategy: data.content_strategy ?? "",
        platform_suggestions: data.platform_suggestions ?? [],
        estimated_revenue: data.estimated_revenue ?? "",
      };
    } catch { /* use defaults */ }

    // Parse supervisor consistency check
    let consistencyCheck = {
      theory_composition_valid: true,
      lesson_instrument_aligned: true,
      exercise_accuracy: true,
      progressive_difficulty: true,
      issues: [] as string[],
      quality_notes: [] as string[],
    };
    let verdict = "Music education app generated successfully.";
    try {
      const cleaned = (state.supervisorResult ?? "")
        .replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
      const data = JSON.parse(cleaned);
      const cc = data.consistency_check ?? {};
      consistencyCheck = {
        theory_composition_valid: cc.theory_composition_valid ?? true,
        lesson_instrument_aligned: cc.lesson_instrument_aligned ?? true,
        exercise_accuracy: cc.exercise_accuracy ?? true,
        progressive_difficulty: cc.progressive_difficulty ?? true,
        issues: cc.issues ?? [],
        quality_notes: data.quality_notes ?? [],
      };
      verdict = data.summary ?? verdict;
    } catch { /* use defaults */ }

    // Compute education score
    const theoryDepth = Math.min(10, Math.max(1, concepts.length * 2));
    const interactivity = Math.min(10, Math.max(1,
      lessons.reduce((sum, l) => sum + l.sections.filter(s => s.type === "exercise" || s.type === "quiz").length, 0) * 2
    ));
    const audioQuality = Math.min(10, Math.max(1, instruments.length * 2 + (midiCode ? 2 : 0)));
    const pedagogy = Math.min(10, Math.max(1, lessons.length * 2 + quizBank.length));
    const engagement = Math.min(10, Math.max(1,
      (quizBank.length > 0 ? 3 : 0) + (instruments.length > 0 ? 3 : 0) + (compositions.length > 0 ? 2 : 0) + (learningPath.length > 0 ? 2 : 0)
    ));
    const overall = Math.round(((theoryDepth + interactivity + audioQuality + pedagogy + engagement) / 5) * 10) / 10;

    const musicEduScore: MusicEduScore = {
      theory_depth: theoryDepth,
      interactivity,
      audio_quality: audioQuality,
      pedagogy,
      engagement,
      overall,
    };

    const report: MusicEduReport = {
      concepts,
      compositions,
      lessons,
      instruments,
      mathAnalysis: {
        calculations,
        frequency_table: frequencyTable,
        harmonic_analysis: harmonicAnalysis,
      },
      midiCode,
      musicEduScore,
      monetization,
      quizBank,
      learningPath,
      prerequisites,
      consistencyCheck,
      verdict,
    };

    return {
      musicEduReport: report,
      iteration: state.iteration + 1,
      status: "complete",
      agentMessages: [{
        agent: "assembler",
        content: "Music education report assembled.",
        timestamp: new Date().toISOString(),
      }],
    };
  };
}

// ── Routing ──

function shouldIterateMusicEdu(state: MusicEduState): "iterate" | "finalize" {
  if (state.iteration >= state.maxIterations) return "finalize";

  // Check if supervisor flagged need for iteration
  try {
    const cleaned = (state.supervisorResult ?? "")
      .replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
    const data = JSON.parse(cleaned);
    if (data.needs_iteration) return "iterate";
  } catch { /* proceed to finalize */ }

  return "finalize";
}

// ── Build the graph ──

function buildMusicEduGraph(provider: LLMProvider) {
  const graph = new StateGraph(MusicEduAnnotation)
    // Phase 1: Parallel initial analysis (theory + instruments)
    .addNode("theory-analyzer", createMusicEduSpecialistNode("theory-analyzer", provider))
    .addNode("instrument-simulator", createMusicEduSpecialistNode("instrument-simulator", provider))
    // Phase 2: Dependent specialists (composition needs theory, lessons need instruments)
    .addNode("composition-generator", createMusicEduSpecialistNode("composition-generator", provider))
    .addNode("lesson-builder", createMusicEduSpecialistNode("lesson-builder", provider))
    // Phase 3: Supervisor merge and consistency check
    .addNode("supervisor", createMusicEduSupervisorNode(provider))
    // Phase 4: Parallel validation and strategy
    .addNode("math-harmonics", createMusicEduSpecialistNode("math-harmonics", provider))
    .addNode("monetization-advisor", createMusicEduSpecialistNode("monetization-advisor", provider))
    // Phase 5: Final assembly
    .addNode("assembler", createMusicEduAssemblerNode())

    // Fan-out: start → theory + instruments in parallel
    .addEdge("__start__", "theory-analyzer")
    .addEdge("__start__", "instrument-simulator")

    // Theory → composition (needs theory concepts first)
    .addEdge("theory-analyzer", "composition-generator")

    // Instruments → lessons (needs instrument configs for exercises)
    .addEdge("instrument-simulator", "lesson-builder")

    // Composition + lessons → supervisor
    .addEdge("composition-generator", "supervisor")
    .addEdge("lesson-builder", "supervisor")

    // Supervisor → math + monetization in parallel
    .addEdge("supervisor", "math-harmonics")
    .addEdge("supervisor", "monetization-advisor")

    // Both → assembler
    .addEdge("math-harmonics", "assembler")
    .addEdge("monetization-advisor", "assembler")

    // Assembler → conditional: iterate or end
    .addConditionalEdges("assembler", shouldIterateMusicEdu, {
      iterate: "theory-analyzer",
      finalize: "__end__",
    });

  return graph.compile();
}

// ── Public API ──

/**
 * Execute the Music Education agent swarm on a music app idea.
 *
 * Flow:
 * 1. Resolves the user's best available provider
 * 2. Fans out to Theory Analyzer and Instrument Simulator in parallel
 * 3. Composition Generator uses theory output; Lesson Builder uses instrument configs
 * 4. Supervisor merges and checks theory-composition consistency and lesson-instrument alignment
 * 5. Math Harmonics validates frequencies, intervals, and waveform math
 * 6. Monetization Advisor produces freemium/subscription strategy
 * 7. Assembler produces the final unified Music Education report
 */
export async function runMusicEduSwarm(
  idea: string,
  options?: {
    focusArea?: "theory" | "composition" | "instrument" | "full-app";
    difficulty?: "beginner" | "intermediate" | "advanced";
    maxIterations?: number;
  }
): Promise<MusicEduResult> {
  const provider = await resolveProvider();

  const app = buildMusicEduGraph(provider);

  const finalState = await app.invoke({
    idea,
    focusArea: options?.focusArea ?? "full-app",
    difficulty: options?.difficulty ?? "beginner",
    maxIterations: options?.maxIterations ?? 2,
  });

  const state = finalState as MusicEduState;

  return {
    report: state.musicEduReport ?? {
      concepts: [],
      compositions: [],
      lessons: [],
      instruments: [],
      mathAnalysis: {
        calculations: [],
        frequency_table: [],
        harmonic_analysis: { overtone_series: [], consonance_ranking: [] },
      },
      midiCode: "",
      musicEduScore: { theory_depth: 0, interactivity: 0, audio_quality: 0, pedagogy: 0, engagement: 0, overall: 0 },
      monetization: {
        model: "freemium",
        tiers: [],
        content_strategy: "",
        platform_suggestions: [],
        estimated_revenue: "",
      },
      quizBank: [],
      learningPath: [],
      prerequisites: [],
      consistencyCheck: {
        theory_composition_valid: false,
        lesson_instrument_aligned: false,
        exercise_accuracy: false,
        progressive_difficulty: false,
        issues: [],
        quality_notes: [],
      },
      verdict: "Music education swarm failed to produce a report.",
    },
    messages: state.agentMessages,
    iterations: state.iteration,
    provider,
  };
}
