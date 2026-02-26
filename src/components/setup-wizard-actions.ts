"use server";

import { saveTasteProfile } from "@/lib/taste";
import type { TasteProfile } from "@/lib/taste";

export async function saveWizardTasteProfile(
  profile: Partial<TasteProfile>
): Promise<{ success: boolean; error: string | null }> {
  try {
    await saveTasteProfile(profile);
    return { success: true, error: null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to save preferences",
    };
  }
}
