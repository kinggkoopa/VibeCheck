import { VisionUpload } from "@/components/VisionUpload";

export const dynamic = "force-dynamic";

export default function VisionPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Vision Analysis</h1>
        <p className="mt-1 text-sm text-muted">
          Upload screenshots, UI mockups, or code images for AI-powered analysis.
          Supports drag & drop, clipboard paste, and file upload.
        </p>
      </div>

      <VisionUpload />
    </div>
  );
}
