import { MusicLessonUI } from "@/components/MusicLessonUI";

export const dynamic = "force-dynamic";

export default function MusicEduPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Music Edu</h1>
        <p className="mt-1 text-sm text-muted">
          Multi-agent swarm for vibe-coding music education apps. Generates
          theory lessons, MIDI compositions, interactive exercises, instrument
          simulators, and harmonic analysis — all validated with music math.
        </p>
      </div>

      <MusicLessonUI />
    </div>
  );
}
