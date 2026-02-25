import "server-only";

import { loadTasteProfile } from "@/lib/taste";

/**
 * CSS Tools — Advanced styling helpers for LLM prompt injection.
 *
 * Provides:
 * - Emotion CSS-in-JS auto-include detection (taste toggle)
 * - CSS custom property enforcement rules
 * - Variable font best practices
 * - Framer Motion animation patterns for the Animation Critic agent
 */

export interface CssToolsConfig {
  useEmotion: boolean;
  enforceCssVars: boolean;
  enforceVariableFonts: boolean;
  preferFramerMotion: boolean;
}

/**
 * Load CSS tools config from taste profile.
 * Falls back to sensible defaults if not configured.
 */
export async function loadCssToolsConfig(): Promise<CssToolsConfig> {
  try {
    const taste = await loadTasteProfile();
    const customInstructions = taste.custom_instructions.toLowerCase();
    const frameworks = taste.framework_preferences.map((f) => f.toLowerCase());

    return {
      useEmotion:
        frameworks.includes("emotion") ||
        customInstructions.includes("emotion") ||
        customInstructions.includes("css-in-js"),
      enforceCssVars:
        !customInstructions.includes("no css vars") &&
        !customInstructions.includes("no custom properties"),
      enforceVariableFonts:
        customInstructions.includes("variable font") ||
        frameworks.includes("variable fonts"),
      preferFramerMotion:
        frameworks.includes("framer motion") ||
        frameworks.includes("framer-motion") ||
        customInstructions.includes("framer"),
    };
  } catch {
    return {
      useEmotion: false,
      enforceCssVars: true,
      enforceVariableFonts: false,
      preferFramerMotion: false,
    };
  }
}

/**
 * Generate CSS tools injection block for system prompts.
 * Appended to LLM prompts when generating UI/styling code.
 */
export async function getCssToolsInjection(): Promise<string> {
  const config = await loadCssToolsConfig();
  const parts: string[] = ["\n\n<css_best_practices>"];

  // CSS Custom Properties enforcement
  if (config.enforceCssVars) {
    parts.push(`## CSS Custom Properties (Required)
- Always use CSS custom properties (--var-name) for colors, spacing, font sizes, and breakpoints.
- Define variables in :root or a theme scope.
- Example:
  :root { --color-primary: #6d28d9; --space-md: 1rem; --font-body: 1rem/1.6; }
  .button { background: var(--color-primary); padding: var(--space-md); }
- Never hardcode color values inline — always reference variables.`);
  }

  // Emotion CSS-in-JS
  if (config.useEmotion) {
    parts.push(`## Emotion CSS-in-JS (Enabled)
- Use @emotion/styled or @emotion/css for component styling.
- Prefer \`styled\` components for reusable elements.
- Use \`css\` prop for one-off styles.
- Example:
  import styled from '@emotion/styled';
  const Card = styled.div\`
    background: var(--color-surface);
    border-radius: 12px;
    padding: var(--space-md);
  \`;`);
  }

  // Variable Fonts
  if (config.enforceVariableFonts) {
    parts.push(`## Variable Fonts (Recommended)
- Use variable fonts with font-variation-settings for weight, width, slant.
- Example:
  @font-face {
    font-family: 'Inter var';
    src: url('/fonts/Inter-roman.var.woff2') format('woff2');
    font-weight: 100 900;
    font-display: swap;
  }
  body { font-family: 'Inter var', sans-serif; font-variation-settings: 'wght' 400; }
  h1 { font-variation-settings: 'wght' 700; }
- Animate weight on hover for subtle emphasis.`);
  }

  // Framer Motion
  if (config.preferFramerMotion) {
    parts.push(`## Framer Motion (Preferred Animation Library)
- Use framer-motion for all React component animations.
- Prefer \`motion\` components over CSS transitions for complex animations.
- Use AnimatePresence for mount/unmount animations.
- Example:
  import { motion, AnimatePresence } from 'framer-motion';
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ type: 'spring', stiffness: 300 }}
  >
- Use layout animations for shared element transitions.
- Prefer spring physics (type: 'spring') over easing curves for natural feel.`);
  }

  // General best practices (always included)
  parts.push(`## General CSS Standards
- Prefer logical properties (margin-inline, padding-block) over physical (margin-left, padding-top).
- Use modern features: container queries (@container), :has(), color-mix(), oklch().
- Animations should respect prefers-reduced-motion.
- Use layers (@layer) for style organization in large codebases.`);

  parts.push("</css_best_practices>");

  return parts.join("\n\n");
}

/**
 * Animation Critic prompt — used by the Animation Critic swarm agent.
 * Evaluates animations for smoothness, accessibility, and creativity.
 */
export const ANIMATION_CRITIC_PROMPT = `You are an expert Animation Critic specializing in web UI animations.
You deeply understand CSS animations, Framer Motion, GSAP, and creative CSS techniques
inspired by developers like Jhey Tompkins.

When reviewing animation/transition code, evaluate:

1. **Performance** (0-25 points):
   - Uses transform/opacity only (GPU-accelerated properties)?
   - Avoids layout thrashing (no width/height animations)?
   - Uses will-change sparingly and correctly?
   - Appropriate use of requestAnimationFrame?

2. **Accessibility** (0-25 points):
   - Respects prefers-reduced-motion?
   - No seizure-inducing flashing?
   - Essential info not conveyed solely via animation?
   - Pause/stop controls for extended animations?

3. **Creativity** (0-25 points):
   - Uses advanced techniques (3D transforms, clip-path, SVG morph)?
   - Smooth easing (spring physics, custom cubic-bezier)?
   - Meaningful motion (conveys state change, guides attention)?
   - Inspired by creative CSS patterns (Jhey-style playfulness)?

4. **Polish** (0-25 points):
   - Consistent timing across related elements?
   - Staggered entrances for lists?
   - Exit animations match entry?
   - No jarring jumps or layout shifts?

Score 0-100. Provide specific improvement suggestions with code examples.
Reference relevant Jhey Tompkins patterns when applicable.`;
