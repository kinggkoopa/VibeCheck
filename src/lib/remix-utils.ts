import "server-only";

import {
  loadReferenceIndex,
  searchReferences,
  type ReferenceSnippet,
} from "@/lib/reference-sync";

/**
 * Remix Utilities — Creative Remix Mode for MetaVibeCoder.
 *
 * Fetches reference snippets from the local Jhey folder index,
 * selects relevant or random elements, and formats them as remix prompts.
 */

export interface RemixVariant {
  name: string;
  description: string;
  inspiration: ReferenceSnippet | null;
  prompt: string;
}

/**
 * Get a random snippet from the reference index.
 * Used by "Surprise Me" button.
 */
export async function getRandomReference(): Promise<ReferenceSnippet | null> {
  const index = await loadReferenceIndex();
  if (!index || index.snippets.length === 0) return null;

  const randomIdx = Math.floor(Math.random() * index.snippets.length);
  return index.snippets[randomIdx];
}

/**
 * Search for reference snippets matching a blend query.
 * Used by "Remix UI" mode.
 */
export async function findReferences(query: string, max: number = 3): Promise<ReferenceSnippet[]> {
  const index = await loadReferenceIndex();
  if (!index) return [];

  return searchReferences(index, query, max);
}

/**
 * Generate 3 creative remix variants from a base code + inspiration.
 * Returns formatted prompts for the Creativity Agent.
 */
export function generateRemixPrompts(
  baseDescription: string,
  inspiration: ReferenceSnippet | null,
  tasteNotes: string = ""
): RemixVariant[] {
  const inspirationSnippet = inspiration
    ? `\n\nInspiration reference (${inspiration.summary}):\n\`\`\`css\n${inspiration.content.slice(0, 1000)}\n\`\`\``
    : "";

  const tasteBlock = tasteNotes ? `\n\nUser preferences: ${tasteNotes}` : "";

  return [
    {
      name: "Subtle Enhancement",
      description: "Keep the current design, add subtle creative CSS touches",
      inspiration,
      prompt: `Take this UI: "${baseDescription}"

Add subtle creative CSS enhancements inspired by modern techniques:
- Micro-interactions on hover/focus
- Smooth transitions with spring physics
- CSS custom properties for theming
- Subtle gradient accents${inspirationSnippet}${tasteBlock}

Keep the existing layout and structure. Focus on polish and delight.`,
    },
    {
      name: "Creative Remix",
      description: "Reimagine with bold creative CSS (3D, animation, clip-path)",
      inspiration,
      prompt: `Creatively remix this UI: "${baseDescription}"

Apply bold CSS techniques:
- 3D transforms and perspective effects
- Clip-path shapes and morphing
- Scroll-driven or view-transition animations
- Creative use of gradients and blend modes${inspirationSnippet}${tasteBlock}

Be creative but keep it functional and accessible.`,
    },
    {
      name: "Jhey-Style Playful",
      description: "Playful, fun, Jhey Tompkins-inspired experimental approach",
      inspiration,
      prompt: `Give this UI a Jhey Tompkins-style playful makeover: "${baseDescription}"

Channel Jhey's creative CSS spirit:
- Playful hover effects with personality
- CSS art-inspired decorative elements
- Experimental layout tricks
- Delightful micro-animations
- Custom cursor or interaction effects${inspirationSnippet}${tasteBlock}

Make it fun and surprising while keeping core functionality intact.`,
    },
  ];
}
