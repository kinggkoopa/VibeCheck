/**
 * Music Theory Utility Library
 *
 * Provides music theory data structures, MIDI helpers, scale/chord generators,
 * frequency calculations, and educational content for the Music Education Agent.
 *
 * Covers: chromatic notes, scales (15 types), chord types (13), common progressions,
 * intervals, guitar tuning, piano key map, General MIDI instruments, and utility
 * functions for note conversion, transposition, and analysis.
 */

// ── Types ──

export interface ScaleDefinition {
  name: string;
  intervals: number[];
  pattern: string;
  mood: string;
  commonUses: string[];
}

export interface ChordDefinition {
  name: string;
  intervals: number[];
  symbol: string;
  quality: string;
}

export interface ProgressionDef {
  name: string;
  numerals: string;
  genre: string;
  mood: string;
  chords_in_c: string[];
}

export interface IntervalDef {
  name: string;
  semitones: number;
  ratio_just: string;
  ratio_equal: string;
  consonance: "perfect" | "imperfect" | "dissonant";
}

export interface GuitarNote {
  string: number;
  openNote: string;
  midiNote: number;
}

export interface PianoKey {
  keyNumber: number;
  note: string;
  octave: number;
  midiNote: number;
  isBlack: boolean;
}

export interface MidiNoteEvent {
  pitch: number;
  duration: number;
  velocity: number;
}

export interface MidiTrackData {
  name: string;
  events: Array<{
    type: "note_on" | "note_off";
    tick: number;
    note: number;
    velocity: number;
    channel: number;
  }>;
  ticks_per_beat: number;
  tempo_bpm: number;
}

export interface MetronomeEvent {
  tick: number;
  time_ms: number;
  beat: number;
  subdivision: number;
  accent: boolean;
}

export interface ProgressionAnalysis {
  chords: string[];
  key: string;
  numerals: string;
  name: string | null;
  quality: string;
}

export interface GMInstrument {
  program: number;
  name: string;
  family: string;
}

// ── Constants ──

export const NOTE_NAMES: string[] = [
  "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
];

const NOTE_INDEX: Record<string, number> = {};
NOTE_NAMES.forEach((n, i) => { NOTE_INDEX[n] = i; });

// Also accept flats for input parsing
const ENHARMONIC_MAP: Record<string, string> = {
  "Db": "C#", "Eb": "D#", "Fb": "E", "Gb": "F#", "Ab": "G#", "Bb": "A#", "Cb": "B",
  "E#": "F", "B#": "C",
};

function normalizeNote(note: string): string {
  const trimmed = note.trim();
  if (NOTE_INDEX[trimmed] !== undefined) return trimmed;
  if (ENHARMONIC_MAP[trimmed]) return ENHARMONIC_MAP[trimmed];
  // Try capitalization
  const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  if (NOTE_INDEX[capitalized] !== undefined) return capitalized;
  if (ENHARMONIC_MAP[capitalized]) return ENHARMONIC_MAP[capitalized];
  return trimmed;
}

export const SCALES: Record<string, ScaleDefinition> = {
  "major": {
    name: "Major (Ionian)",
    intervals: [2, 2, 1, 2, 2, 2, 1],
    pattern: "W-W-H-W-W-W-H",
    mood: "Bright, happy, triumphant",
    commonUses: ["Pop", "Classical", "Country", "Rock"],
  },
  "natural-minor": {
    name: "Natural Minor (Aeolian)",
    intervals: [2, 1, 2, 2, 1, 2, 2],
    pattern: "W-H-W-W-H-W-W",
    mood: "Sad, melancholic, introspective",
    commonUses: ["Rock", "Classical", "Folk", "Metal"],
  },
  "harmonic-minor": {
    name: "Harmonic Minor",
    intervals: [2, 1, 2, 2, 1, 3, 1],
    pattern: "W-H-W-W-H-WH-H",
    mood: "Exotic, dramatic, Middle Eastern feel",
    commonUses: ["Classical", "Metal", "Flamenco", "Middle Eastern"],
  },
  "melodic-minor": {
    name: "Melodic Minor (ascending)",
    intervals: [2, 1, 2, 2, 2, 2, 1],
    pattern: "W-H-W-W-W-W-H",
    mood: "Smooth, jazzy, sophisticated",
    commonUses: ["Jazz", "Classical", "Fusion"],
  },
  "dorian": {
    name: "Dorian Mode",
    intervals: [2, 1, 2, 2, 2, 1, 2],
    pattern: "W-H-W-W-W-H-W",
    mood: "Mellow, slightly minor, groovy",
    commonUses: ["Jazz", "Blues", "Funk", "Rock"],
  },
  "phrygian": {
    name: "Phrygian Mode",
    intervals: [1, 2, 2, 2, 1, 2, 2],
    pattern: "H-W-W-W-H-W-W",
    mood: "Dark, Spanish, mysterious",
    commonUses: ["Flamenco", "Metal", "Film scores"],
  },
  "lydian": {
    name: "Lydian Mode",
    intervals: [2, 2, 2, 1, 2, 2, 1],
    pattern: "W-W-W-H-W-W-H",
    mood: "Dreamy, ethereal, floating",
    commonUses: ["Film scores", "Jazz", "Progressive rock"],
  },
  "mixolydian": {
    name: "Mixolydian Mode",
    intervals: [2, 2, 1, 2, 2, 1, 2],
    pattern: "W-W-H-W-W-H-W",
    mood: "Bluesy, dominant, rock-oriented",
    commonUses: ["Blues", "Rock", "Country", "Folk"],
  },
  "aeolian": {
    name: "Aeolian Mode",
    intervals: [2, 1, 2, 2, 1, 2, 2],
    pattern: "W-H-W-W-H-W-W",
    mood: "Sad, melancholic, natural minor equivalent",
    commonUses: ["Rock", "Pop", "Classical", "Folk"],
  },
  "locrian": {
    name: "Locrian Mode",
    intervals: [1, 2, 2, 1, 2, 2, 2],
    pattern: "H-W-W-H-W-W-W",
    mood: "Unstable, diminished, dark",
    commonUses: ["Metal", "Jazz", "Experimental"],
  },
  "pentatonic-major": {
    name: "Major Pentatonic",
    intervals: [2, 2, 3, 2, 3],
    pattern: "W-W-m3-W-m3",
    mood: "Simple, bright, open",
    commonUses: ["Country", "Blues", "Rock", "Pop", "World music"],
  },
  "pentatonic-minor": {
    name: "Minor Pentatonic",
    intervals: [3, 2, 2, 3, 2],
    pattern: "m3-W-W-m3-W",
    mood: "Bluesy, soulful, universal",
    commonUses: ["Blues", "Rock", "Jazz", "R&B"],
  },
  "blues": {
    name: "Blues Scale",
    intervals: [3, 2, 1, 1, 3, 2],
    pattern: "m3-W-H-H-m3-W",
    mood: "Soulful, gritty, expressive",
    commonUses: ["Blues", "Jazz", "Rock", "R&B"],
  },
  "chromatic": {
    name: "Chromatic Scale",
    intervals: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    pattern: "H-H-H-H-H-H-H-H-H-H-H-H",
    mood: "Tense, atonal, all-encompassing",
    commonUses: ["Exercises", "Atonal music", "Warm-ups", "Transitions"],
  },
  "whole-tone": {
    name: "Whole Tone Scale",
    intervals: [2, 2, 2, 2, 2, 2],
    pattern: "W-W-W-W-W-W",
    mood: "Dreamlike, ambiguous, impressionistic",
    commonUses: ["Impressionism", "Film scores", "Jazz", "Debussy"],
  },
};

export const CHORD_TYPES: Record<string, ChordDefinition> = {
  "major": {
    name: "Major Triad",
    intervals: [0, 4, 7],
    symbol: "",
    quality: "Bright, happy, stable, consonant",
  },
  "minor": {
    name: "Minor Triad",
    intervals: [0, 3, 7],
    symbol: "m",
    quality: "Sad, dark, melancholic, consonant",
  },
  "diminished": {
    name: "Diminished Triad",
    intervals: [0, 3, 6],
    symbol: "dim",
    quality: "Tense, unstable, wants to resolve",
  },
  "augmented": {
    name: "Augmented Triad",
    intervals: [0, 4, 8],
    symbol: "aug",
    quality: "Mysterious, suspenseful, unresolved",
  },
  "dom7": {
    name: "Dominant 7th",
    intervals: [0, 4, 7, 10],
    symbol: "7",
    quality: "Bluesy, tense, strongly wants resolution to tonic",
  },
  "maj7": {
    name: "Major 7th",
    intervals: [0, 4, 7, 11],
    symbol: "maj7",
    quality: "Lush, dreamy, jazzy, sophisticated",
  },
  "min7": {
    name: "Minor 7th",
    intervals: [0, 3, 7, 10],
    symbol: "m7",
    quality: "Smooth, mellow, jazzy minor feel",
  },
  "dim7": {
    name: "Diminished 7th",
    intervals: [0, 3, 6, 9],
    symbol: "dim7",
    quality: "Very tense, symmetrical, ambiguous key center",
  },
  "sus2": {
    name: "Suspended 2nd",
    intervals: [0, 2, 7],
    symbol: "sus2",
    quality: "Open, ambiguous, modern, no major or minor feel",
  },
  "sus4": {
    name: "Suspended 4th",
    intervals: [0, 5, 7],
    symbol: "sus4",
    quality: "Suspended, wanting resolution, folk-like",
  },
  "add9": {
    name: "Add 9",
    intervals: [0, 4, 7, 14],
    symbol: "add9",
    quality: "Rich, colorful, extended major sound",
  },
  "min9": {
    name: "Minor 9th",
    intervals: [0, 3, 7, 10, 14],
    symbol: "m9",
    quality: "Complex, smooth jazz, neo-soul",
  },
  "maj9": {
    name: "Major 9th",
    intervals: [0, 4, 7, 11, 14],
    symbol: "maj9",
    quality: "Lush, sophisticated, dreamy jazz",
  },
};

export const COMMON_PROGRESSIONS: ProgressionDef[] = [
  {
    name: "Classic Rock / Pop",
    numerals: "I-IV-V-I",
    genre: "Rock, Pop, Country",
    mood: "Strong, resolved, classic",
    chords_in_c: ["C", "F", "G", "C"],
  },
  {
    name: "Pop Anthem",
    numerals: "I-V-vi-IV",
    genre: "Pop, Rock, Anthems",
    mood: "Uplifting, emotional, singable",
    chords_in_c: ["C", "G", "Am", "F"],
  },
  {
    name: "Jazz ii-V-I",
    numerals: "ii-V-I",
    genre: "Jazz, Bossa Nova, Standards",
    mood: "Smooth, sophisticated, resolved",
    chords_in_c: ["Dm7", "G7", "Cmaj7"],
  },
  {
    name: "50s Doo-Wop",
    numerals: "I-vi-IV-V",
    genre: "50s Pop, Doo-Wop, Oldies",
    mood: "Nostalgic, sweet, romantic",
    chords_in_c: ["C", "Am", "F", "G"],
  },
  {
    name: "Modern Pop",
    numerals: "vi-IV-I-V",
    genre: "Modern Pop, EDM, Indie",
    mood: "Emotional, driving, anthemic",
    chords_in_c: ["Am", "F", "C", "G"],
  },
  {
    name: "Optimistic Pop",
    numerals: "I-IV-vi-V",
    genre: "Pop, Indie, Singer-songwriter",
    mood: "Hopeful, bittersweet, flowing",
    chords_in_c: ["C", "F", "Am", "G"],
  },
  {
    name: "Natural Minor Progression",
    numerals: "i-VI-III-VII",
    genre: "Rock, Metal, Gothic",
    mood: "Dark, epic, powerful",
    chords_in_c: ["Cm", "Ab", "Eb", "Bb"],
  },
  {
    name: "12-Bar Blues",
    numerals: "I-I-I-I-IV-IV-I-I-V-IV-I-V",
    genre: "Blues, Rock, Jazz",
    mood: "Bluesy, soulful, grounded",
    chords_in_c: ["C", "C", "C", "C", "F", "F", "C", "C", "G", "F", "C", "G"],
  },
];

export const INTERVALS: IntervalDef[] = [
  { name: "Unison", semitones: 0, ratio_just: "1:1", ratio_equal: "1.000", consonance: "perfect" },
  { name: "Minor 2nd", semitones: 1, ratio_just: "16:15", ratio_equal: "1.059", consonance: "dissonant" },
  { name: "Major 2nd", semitones: 2, ratio_just: "9:8", ratio_equal: "1.122", consonance: "dissonant" },
  { name: "Minor 3rd", semitones: 3, ratio_just: "6:5", ratio_equal: "1.189", consonance: "imperfect" },
  { name: "Major 3rd", semitones: 4, ratio_just: "5:4", ratio_equal: "1.260", consonance: "imperfect" },
  { name: "Perfect 4th", semitones: 5, ratio_just: "4:3", ratio_equal: "1.335", consonance: "perfect" },
  { name: "Tritone", semitones: 6, ratio_just: "45:32", ratio_equal: "1.414", consonance: "dissonant" },
  { name: "Perfect 5th", semitones: 7, ratio_just: "3:2", ratio_equal: "1.498", consonance: "perfect" },
  { name: "Minor 6th", semitones: 8, ratio_just: "8:5", ratio_equal: "1.587", consonance: "imperfect" },
  { name: "Major 6th", semitones: 9, ratio_just: "5:3", ratio_equal: "1.682", consonance: "imperfect" },
  { name: "Minor 7th", semitones: 10, ratio_just: "16:9", ratio_equal: "1.782", consonance: "dissonant" },
  { name: "Major 7th", semitones: 11, ratio_just: "15:8", ratio_equal: "1.888", consonance: "dissonant" },
  { name: "Octave", semitones: 12, ratio_just: "2:1", ratio_equal: "2.000", consonance: "perfect" },
];

export const GUITAR_STANDARD_TUNING: GuitarNote[] = [
  { string: 6, openNote: "E", midiNote: 40 },   // E2
  { string: 5, openNote: "A", midiNote: 45 },   // A2
  { string: 4, openNote: "D", midiNote: 50 },   // D3
  { string: 3, openNote: "G", midiNote: 55 },   // G3
  { string: 2, openNote: "B", midiNote: 59 },   // B3
  { string: 1, openNote: "E", midiNote: 64 },   // E4
];

// ── Piano Key Map (88 keys: A0 to C8) ──

function buildPianoKeyMap(): PianoKey[] {
  const keys: PianoKey[] = [];
  const blackNotes = new Set([1, 3, 6, 8, 10]); // C#, D#, F#, G#, A#

  // Piano starts at A0 (MIDI 21) and ends at C8 (MIDI 108)
  for (let midi = 21; midi <= 108; midi++) {
    const noteIdx = midi % 12;
    const octave = Math.floor(midi / 12) - 1;
    keys.push({
      keyNumber: midi - 20, // 1-88
      note: NOTE_NAMES[noteIdx],
      octave,
      midiNote: midi,
      isBlack: blackNotes.has(noteIdx),
    });
  }

  return keys;
}

export const PIANO_KEY_MAP: PianoKey[] = buildPianoKeyMap();

// ── General MIDI Instruments (first 32 + selected others) ──

export const GM_INSTRUMENTS: GMInstrument[] = [
  // Piano family
  { program: 0, name: "Acoustic Grand Piano", family: "Piano" },
  { program: 1, name: "Bright Acoustic Piano", family: "Piano" },
  { program: 2, name: "Electric Grand Piano", family: "Piano" },
  { program: 3, name: "Honky-tonk Piano", family: "Piano" },
  { program: 4, name: "Electric Piano 1", family: "Piano" },
  { program: 5, name: "Electric Piano 2", family: "Piano" },
  { program: 6, name: "Harpsichord", family: "Piano" },
  { program: 7, name: "Clavinet", family: "Piano" },
  // Chromatic Percussion
  { program: 8, name: "Celesta", family: "Chromatic Percussion" },
  { program: 9, name: "Glockenspiel", family: "Chromatic Percussion" },
  { program: 10, name: "Music Box", family: "Chromatic Percussion" },
  { program: 11, name: "Vibraphone", family: "Chromatic Percussion" },
  { program: 12, name: "Marimba", family: "Chromatic Percussion" },
  { program: 13, name: "Xylophone", family: "Chromatic Percussion" },
  { program: 14, name: "Tubular Bells", family: "Chromatic Percussion" },
  { program: 15, name: "Dulcimer", family: "Chromatic Percussion" },
  // Organ
  { program: 16, name: "Drawbar Organ", family: "Organ" },
  { program: 17, name: "Percussive Organ", family: "Organ" },
  { program: 18, name: "Rock Organ", family: "Organ" },
  { program: 19, name: "Church Organ", family: "Organ" },
  { program: 20, name: "Reed Organ", family: "Organ" },
  { program: 21, name: "Accordion", family: "Organ" },
  { program: 22, name: "Harmonica", family: "Organ" },
  { program: 23, name: "Tango Accordion", family: "Organ" },
  // Guitar
  { program: 24, name: "Acoustic Guitar (nylon)", family: "Guitar" },
  { program: 25, name: "Acoustic Guitar (steel)", family: "Guitar" },
  { program: 26, name: "Electric Guitar (jazz)", family: "Guitar" },
  { program: 27, name: "Electric Guitar (clean)", family: "Guitar" },
  { program: 28, name: "Electric Guitar (muted)", family: "Guitar" },
  { program: 29, name: "Overdriven Guitar", family: "Guitar" },
  { program: 30, name: "Distortion Guitar", family: "Guitar" },
  { program: 31, name: "Guitar Harmonics", family: "Guitar" },
  // Bass
  { program: 32, name: "Acoustic Bass", family: "Bass" },
  { program: 33, name: "Electric Bass (finger)", family: "Bass" },
  { program: 34, name: "Electric Bass (pick)", family: "Bass" },
  { program: 35, name: "Fretless Bass", family: "Bass" },
  // Strings
  { program: 40, name: "Violin", family: "Strings" },
  { program: 41, name: "Viola", family: "Strings" },
  { program: 42, name: "Cello", family: "Strings" },
  { program: 43, name: "Contrabass", family: "Strings" },
  { program: 48, name: "String Ensemble 1", family: "Strings" },
  // Brass
  { program: 56, name: "Trumpet", family: "Brass" },
  { program: 57, name: "Trombone", family: "Brass" },
  { program: 58, name: "Tuba", family: "Brass" },
  { program: 59, name: "Muted Trumpet", family: "Brass" },
  { program: 60, name: "French Horn", family: "Brass" },
  // Woodwinds
  { program: 64, name: "Soprano Sax", family: "Reed" },
  { program: 65, name: "Alto Sax", family: "Reed" },
  { program: 66, name: "Tenor Sax", family: "Reed" },
  { program: 67, name: "Baritone Sax", family: "Reed" },
  { program: 68, name: "Oboe", family: "Reed" },
  { program: 71, name: "Clarinet", family: "Reed" },
  { program: 73, name: "Flute", family: "Pipe" },
  { program: 74, name: "Recorder", family: "Pipe" },
];

// ── Utility Functions ──

/**
 * Convert a note name and octave to a MIDI number.
 * Examples: noteToMidi("C", 4) => 60, noteToMidi("A", 4) => 69
 */
export function noteToMidi(note: string, octave: number): number {
  const normalized = normalizeNote(note);
  const noteIdx = NOTE_INDEX[normalized];
  if (noteIdx === undefined) {
    throw new Error(`Unknown note: ${note}`);
  }
  return (octave + 1) * 12 + noteIdx;
}

/**
 * Convert a MIDI number to a note name and octave.
 * Examples: midiToNote(60) => { note: "C", octave: 4 }, midiToNote(69) => { note: "A", octave: 4 }
 */
export function midiToNote(midi: number): { note: string; octave: number } {
  if (midi < 0 || midi > 127) {
    throw new Error(`MIDI number out of range: ${midi}`);
  }
  const noteIdx = midi % 12;
  const octave = Math.floor(midi / 12) - 1;
  return { note: NOTE_NAMES[noteIdx], octave };
}

/**
 * Convert a MIDI number to frequency in Hz.
 * Default A4 = 440Hz. Formula: f = a4 * 2^((midi - 69) / 12)
 */
export function midiToFrequency(midi: number, a4: number = 440): number {
  return a4 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Convert a frequency in Hz to the nearest MIDI number.
 * Formula: midi = 69 + 12 * log2(freq / a4)
 */
export function frequencyToMidi(freq: number, a4: number = 440): number {
  if (freq <= 0) throw new Error("Frequency must be positive");
  return Math.round(69 + 12 * Math.log2(freq / a4));
}

/**
 * Compute the notes of a scale given a root note and scale type key.
 * Example: getScaleNotes("C", "major") => ["C", "D", "E", "F", "G", "A", "B"]
 */
export function getScaleNotes(root: string, scaleType: string): string[] {
  const scale = SCALES[scaleType];
  if (!scale) {
    throw new Error(`Unknown scale type: ${scaleType}`);
  }

  const normalized = normalizeNote(root);
  const rootIdx = NOTE_INDEX[normalized];
  if (rootIdx === undefined) {
    throw new Error(`Unknown root note: ${root}`);
  }

  const notes: string[] = [normalized];
  let current = rootIdx;

  for (const interval of scale.intervals) {
    current = (current + interval) % 12;
    notes.push(NOTE_NAMES[current]);
  }

  // Remove the last note if it duplicates the root (octave)
  if (notes.length > 1 && notes[notes.length - 1] === notes[0]) {
    notes.pop();
  }

  return notes;
}

/**
 * Compute the notes of a chord given a root note and chord type key.
 * Example: getChordNotes("C", "major") => ["C", "E", "G"]
 */
export function getChordNotes(root: string, chordType: string): string[] {
  const chord = CHORD_TYPES[chordType];
  if (!chord) {
    throw new Error(`Unknown chord type: ${chordType}`);
  }

  const normalized = normalizeNote(root);
  const rootIdx = NOTE_INDEX[normalized];
  if (rootIdx === undefined) {
    throw new Error(`Unknown root note: ${root}`);
  }

  return chord.intervals.map((interval) => NOTE_NAMES[(rootIdx + interval) % 12]);
}

/**
 * Transpose a note by a number of semitones.
 * Example: transposeNote("C", 7) => "G", transposeNote("E", -2) => "D"
 */
export function transposeNote(note: string, semitones: number): string {
  const normalized = normalizeNote(note);
  const idx = NOTE_INDEX[normalized];
  if (idx === undefined) {
    throw new Error(`Unknown note: ${note}`);
  }
  const newIdx = ((idx + semitones) % 12 + 12) % 12;
  return NOTE_NAMES[newIdx];
}

/**
 * Parse roman numerals and generate chords in a given key.
 * Example: generateProgression("C", "I-IV-V-I") => [["C","E","G"], ["F","A","C"], ["G","B","D"], ["C","E","G"]]
 */
export function generateProgression(key: string, numerals: string): string[][] {
  const normalizedKey = normalizeNote(key);
  const keyIdx = NOTE_INDEX[normalizedKey];
  if (keyIdx === undefined) {
    throw new Error(`Unknown key: ${key}`);
  }

  // Major scale degrees in semitones from root
  const majorScaleSemitones = [0, 2, 4, 5, 7, 9, 11];

  const romanMap: Record<string, { degree: number; quality: string }> = {
    "I": { degree: 0, quality: "major" },
    "II": { degree: 1, quality: "major" },
    "III": { degree: 2, quality: "major" },
    "IV": { degree: 3, quality: "major" },
    "V": { degree: 4, quality: "major" },
    "VI": { degree: 5, quality: "major" },
    "VII": { degree: 6, quality: "major" },
    "i": { degree: 0, quality: "minor" },
    "ii": { degree: 1, quality: "minor" },
    "iii": { degree: 2, quality: "minor" },
    "iv": { degree: 3, quality: "minor" },
    "v": { degree: 4, quality: "minor" },
    "vi": { degree: 5, quality: "minor" },
    "vii": { degree: 6, quality: "minor" },
  };

  const chordSequences = numerals.split("-").map((numeral) => {
    const trimmed = numeral.trim();
    const mapping = romanMap[trimmed];
    if (!mapping) {
      // Fallback: return root as major chord
      return getChordNotes(normalizedKey, "major");
    }
    const rootSemitones = majorScaleSemitones[mapping.degree];
    const chordRoot = NOTE_NAMES[(keyIdx + rootSemitones) % 12];
    return getChordNotes(chordRoot, mapping.quality);
  });

  return chordSequences;
}

/**
 * Calculate the interval between two notes (ascending).
 * Example: calculateInterval("C", "G") => { name: "Perfect 5th", semitones: 7 }
 */
export function calculateInterval(note1: string, note2: string): { name: string; semitones: number } {
  const n1 = normalizeNote(note1);
  const n2 = normalizeNote(note2);
  const idx1 = NOTE_INDEX[n1];
  const idx2 = NOTE_INDEX[n2];

  if (idx1 === undefined) throw new Error(`Unknown note: ${note1}`);
  if (idx2 === undefined) throw new Error(`Unknown note: ${note2}`);

  const semitones = ((idx2 - idx1) % 12 + 12) % 12;
  const interval = INTERVALS.find((i) => i.semitones === semitones);

  return {
    name: interval?.name ?? `${semitones} semitones`,
    semitones,
  };
}

/**
 * Generate a structured MIDI track data object (JSON-serializable).
 * Converts an array of note events into a tick-based MIDI representation.
 */
export function generateMidiTrack(
  notes: MidiNoteEvent[],
  name: string = "Track 1",
  tempoBpm: number = 120,
  ticksPerBeat: number = 480
): MidiTrackData {
  const events: MidiTrackData["events"] = [];
  let currentTick = 0;

  // Duration in ticks: quarter note = ticksPerBeat
  function durationToTicks(duration: number): number {
    // duration is in quarter notes (1.0 = quarter, 0.5 = eighth, 2.0 = half, etc.)
    return Math.round(duration * ticksPerBeat);
  }

  for (const note of notes) {
    const durationTicks = durationToTicks(note.duration);
    const velocity = Math.max(0, Math.min(127, note.velocity));
    const pitch = Math.max(0, Math.min(127, note.pitch));

    events.push({
      type: "note_on",
      tick: currentTick,
      note: pitch,
      velocity,
      channel: 0,
    });

    events.push({
      type: "note_off",
      tick: currentTick + durationTicks,
      note: pitch,
      velocity: 0,
      channel: 0,
    });

    currentTick += durationTicks;
  }

  // Sort by tick for proper ordering
  events.sort((a, b) => a.tick - b.tick || (a.type === "note_off" ? -1 : 1));

  return {
    name,
    events,
    ticks_per_beat: ticksPerBeat,
    tempo_bpm: tempoBpm,
  };
}

/**
 * Generate timing events for a metronome pattern.
 * Returns an array of beat events with timing in milliseconds.
 */
export function generateMetronomePattern(
  bpm: number,
  beats: number,
  subdivisions: number = 1
): MetronomeEvent[] {
  if (bpm <= 0) throw new Error("BPM must be positive");
  if (beats <= 0) throw new Error("Beats must be positive");
  if (subdivisions <= 0) throw new Error("Subdivisions must be positive");

  const msPerBeat = 60000 / bpm;
  const msPerSubdivision = msPerBeat / subdivisions;
  const ticksPerBeat = 480;
  const events: MetronomeEvent[] = [];

  for (let beat = 0; beat < beats; beat++) {
    for (let sub = 0; sub < subdivisions; sub++) {
      const timeMs = (beat * subdivisions + sub) * msPerSubdivision;
      const tick = (beat * subdivisions + sub) * (ticksPerBeat / subdivisions);

      events.push({
        tick: Math.round(tick),
        time_ms: Math.round(timeMs * 100) / 100,
        beat: beat + 1,
        subdivision: sub + 1,
        accent: sub === 0,
      });
    }
  }

  return events;
}

/**
 * Analyze a chord progression to identify its pattern, key, and quality.
 * Accepts chord names like ["C", "Am", "F", "G"] or ["Dm7", "G7", "Cmaj7"].
 */
export function analyzeChordProgression(chords: string[]): ProgressionAnalysis {
  if (chords.length === 0) {
    return { chords: [], key: "unknown", numerals: "", name: null, quality: "empty" };
  }

  // Simple heuristic: assume the first chord's root is the key
  // Parse chord root from name (e.g., "Am" -> "A", "Dm7" -> "D", "C#m" -> "C#")
  function parseChordRoot(chord: string): string {
    let root = chord.charAt(0).toUpperCase();
    if (chord.length > 1 && (chord.charAt(1) === "#" || chord.charAt(1) === "b")) {
      root += chord.charAt(1);
    }
    return normalizeNote(root);
  }

  function isMinorChord(chord: string): boolean {
    const afterRoot = chord.charAt(1) === "#" || chord.charAt(1) === "b"
      ? chord.slice(2)
      : chord.slice(1);
    return afterRoot.startsWith("m") && !afterRoot.startsWith("maj");
  }

  const roots = chords.map(parseChordRoot);
  const keyRoot = roots[0];
  const keyIdx = NOTE_INDEX[keyRoot];

  if (keyIdx === undefined) {
    return { chords, key: "unknown", numerals: "", name: null, quality: "unrecognized" };
  }

  // Map chord roots to scale degrees
  const majorScaleSemitones = [0, 2, 4, 5, 7, 9, 11];
  const degreeNames = ["I", "II", "III", "IV", "V", "VI", "VII"];

  const numeralParts = chords.map((chord, i) => {
    const rootDist = ((NOTE_INDEX[roots[i]] - keyIdx) % 12 + 12) % 12;
    const degreeIdx = majorScaleSemitones.indexOf(rootDist);
    if (degreeIdx === -1) return "?";
    const numeral = degreeNames[degreeIdx];
    return isMinorChord(chord) ? numeral.toLowerCase() : numeral;
  });

  const numerals = numeralParts.join("-");

  // Try to match a known progression
  const match = COMMON_PROGRESSIONS.find((p) => p.numerals === numerals);

  return {
    chords,
    key: `${keyRoot} major`,
    numerals,
    name: match?.name ?? null,
    quality: match ? match.mood : "Custom progression",
  };
}
