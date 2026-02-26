/**
 * Auto-Prompt Templates — Deep Ease Enhancement.
 *
 * A library of starter prompt templates for common project archetypes,
 * plus utilities to build, suggest, and enhance prompts automatically.
 */

// ── Types ──

export interface PromptTemplate {
  label: string;
  description: string;
  basePrompt: string;
  tags: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  estimatedTime: string;
}

export interface PromptCustomization {
  tone: "casual" | "professional" | "technical";
  framework: string;
  features: string[];
  monetization: boolean;
}

export interface TemplateSuggestion {
  key: string;
  template: PromptTemplate;
  score: number;
}

// ── Prompt Templates ──

export const PROMPT_TEMPLATES: Record<string, PromptTemplate> = {
  "micro-saas": {
    label: "Micro-SaaS",
    description:
      "A small, focused SaaS product with auth, billing, and a core feature loop. Ship fast, charge monthly.",
    basePrompt: `Build a micro-SaaS application with the following structure:

1. **Auth & Onboarding**: Email/password sign-up with magic link option. New user onboarding wizard collecting use-case and preferences.
2. **Core Feature Loop**: A single, focused feature that solves one problem well. Users should reach their "aha moment" within 60 seconds of signing up.
3. **Billing & Plans**: Stripe integration with a free tier and at least one paid plan. Usage-based limits on the free tier to drive upgrades.
4. **Dashboard**: Clean, minimal dashboard showing key metrics and recent activity. No clutter — every element earns its place.
5. **Settings**: Account management, API key rotation, notification preferences, and plan management.

Tech stack: Next.js 15 App Router, Supabase (auth + database + RLS), Tailwind CSS, shadcn/ui components.
Deploy target: Vercel.`,
    tags: ["saas", "billing", "stripe", "auth", "startup"],
    difficulty: "intermediate",
    estimatedTime: "2-4 hours",
  },

  "landing-page": {
    label: "Landing Page",
    description:
      "A high-converting marketing landing page with hero, features, social proof, and CTA sections.",
    basePrompt: `Build a modern landing page with these sections:

1. **Hero**: Bold headline, subheadline, primary CTA button, and a hero image or product screenshot. Above-the-fold impact.
2. **Social Proof**: Logo bar of recognizable brands or user count badge. Build trust immediately.
3. **Features Grid**: 3-6 feature cards with icons, titles, and short descriptions. Focus on benefits, not specs.
4. **How It Works**: 3-step visual flow showing the user journey from sign-up to value.
5. **Testimonials**: 2-3 customer quotes with names, roles, and avatars. Real social proof.
6. **Pricing**: 2-3 tier cards (Free / Pro / Enterprise) with feature comparison and CTA per tier.
7. **FAQ**: Expandable accordion addressing top objections and common questions.
8. **Footer CTA**: Final conversion section with email capture or sign-up button.

Design: Clean, modern, lots of whitespace. Mobile-first responsive. Smooth scroll animations on section entry.
Tech stack: Next.js static export, Tailwind CSS, Framer Motion for animations.`,
    tags: ["marketing", "conversion", "design", "static", "seo"],
    difficulty: "beginner",
    estimatedTime: "1-2 hours",
  },

  dashboard: {
    label: "Dashboard",
    description:
      "A data-rich admin dashboard with charts, tables, filters, and real-time updates.",
    basePrompt: `Build an analytics dashboard with these components:

1. **KPI Cards**: Top row of 4-6 metric cards showing key numbers with trend indicators (up/down arrows, percentage change vs. previous period).
2. **Charts Section**: Line chart for time-series data, bar chart for comparisons, and a donut/pie chart for distribution. Interactive tooltips on hover.
3. **Data Table**: Sortable, filterable, paginated table with search. Row actions (view, edit, delete). Bulk selection with batch actions.
4. **Filters Bar**: Date range picker, category dropdown, status toggle, and search input. Filters apply to all dashboard widgets simultaneously.
5. **Activity Feed**: Real-time feed of recent events with timestamps and user avatars. Auto-updates without page refresh.
6. **Sidebar Navigation**: Collapsible sidebar with icon + label nav items. Active state indicator. User avatar and role at the bottom.

Data: Use realistic mock data with proper types. Structure for easy swap to real API endpoints.
Tech stack: Next.js App Router, Recharts or Chart.js, Tailwind CSS, React Query for data fetching.`,
    tags: ["analytics", "charts", "admin", "tables", "data"],
    difficulty: "intermediate",
    estimatedTime: "3-5 hours",
  },

  "api-backend": {
    label: "API Backend",
    description:
      "A RESTful or tRPC API backend with authentication, validation, rate limiting, and structured error handling.",
    basePrompt: `Build a production-grade API backend with these layers:

1. **Route Structure**: RESTful endpoints organized by resource (e.g., /api/users, /api/projects, /api/tasks). Consistent naming and HTTP method usage.
2. **Authentication Middleware**: JWT or session-based auth. Protect routes with middleware that validates tokens and attaches user context.
3. **Input Validation**: Zod schemas for all request bodies, query params, and path params. Return structured validation errors with field-level messages.
4. **Database Layer**: Type-safe database queries with Drizzle ORM or Supabase client. Migrations for schema changes. Row-level security where appropriate.
5. **Error Handling**: Centralized error handler. Consistent error response format: { error: string, code: string, details?: object }. Map database errors to user-friendly messages.
6. **Rate Limiting**: Per-user and per-IP rate limiting with configurable windows. Return 429 with Retry-After header.
7. **Logging & Monitoring**: Structured JSON logging for all requests. Include request ID, duration, status code, and user ID. Error tracking integration point.

Tech stack: Next.js API routes or standalone Express/Hono, Zod, Drizzle ORM or Supabase, Redis for rate limiting.`,
    tags: ["api", "rest", "backend", "validation", "auth", "server"],
    difficulty: "advanced",
    estimatedTime: "3-6 hours",
  },

  "mobile-app": {
    label: "Mobile App",
    description:
      "A cross-platform mobile app with native-feeling navigation, offline support, and push notifications.",
    basePrompt: `Build a cross-platform mobile application with these features:

1. **Navigation**: Tab-based bottom navigation with 4-5 main screens. Stack navigation within each tab for drill-down views. Gesture-based back navigation.
2. **Authentication**: Social login (Google, Apple) plus email/password. Biometric unlock for returning users. Secure token storage.
3. **Offline Support**: Cache critical data locally. Queue mutations when offline and sync when connectivity returns. Show clear offline/online indicators.
4. **Push Notifications**: Register for push tokens on login. Handle notification taps to deep-link into relevant screens. Notification preferences screen.
5. **Core Screens**: Home feed with pull-to-refresh, detail view with share action, profile/settings with form inputs, and a search screen with recent/suggested results.
6. **Performance**: Lazy load images with placeholders. Virtualized lists for large datasets. Skeleton screens during loading states.

Tech stack: React Native with Expo, React Navigation, AsyncStorage or MMKV, Expo Notifications.
Design: Follow platform conventions (iOS HIG / Material Design). Support dark mode.`,
    tags: ["mobile", "react-native", "expo", "ios", "android", "cross-platform"],
    difficulty: "advanced",
    estimatedTime: "4-8 hours",
  },

  "chrome-extension": {
    label: "Chrome Extension",
    description:
      "A browser extension with popup UI, content scripts, background service worker, and storage sync.",
    basePrompt: `Build a Chrome extension (Manifest V3) with these components:

1. **Popup UI**: Clean popup window (400x500px max) with a toolbar, main content area, and action buttons. Opens on extension icon click.
2. **Content Script**: Inject functionality into target web pages. Add floating button or sidebar overlay. Communicate with background via chrome.runtime messages.
3. **Background Service Worker**: Handle extension lifecycle events. Manage alarms for periodic tasks. Process messages between popup and content scripts.
4. **Storage**: Use chrome.storage.sync for user preferences (syncs across devices). Use chrome.storage.local for cached data. Migrate storage schema on version updates.
5. **Options Page**: Full-page settings with toggle switches, text inputs, and import/export configuration. Save changes immediately with visual confirmation.
6. **Context Menu**: Add right-click menu items on selected text or page. Process selection and show results in popup or notification.

Manifest V3 required. Use TypeScript. Bundle with Vite or webpack.
Permissions: Request minimal permissions. Use optional permissions for sensitive APIs.`,
    tags: ["extension", "browser", "chrome", "manifest-v3", "content-script"],
    difficulty: "intermediate",
    estimatedTime: "2-4 hours",
  },

  "cli-tool": {
    label: "CLI Tool",
    description:
      "A command-line tool with subcommands, flags, interactive prompts, and colored output.",
    basePrompt: `Build a command-line tool with these features:

1. **Command Structure**: Main command with subcommands (e.g., \`tool init\`, \`tool run\`, \`tool config\`). Global flags (--verbose, --json, --help) plus command-specific flags.
2. **Interactive Mode**: When run without arguments, launch interactive prompts: select lists, text input, confirmation dialogs, and multi-select checkboxes.
3. **Configuration**: Read config from ~/.toolrc.json or .toolrc in project root. Merge project config over global config. \`tool config set/get\` subcommands.
4. **Output Formatting**: Colored terminal output with chalk/picocolors. Spinner for long operations. Progress bar for multi-step tasks. Table formatting for structured data.
5. **Error Handling**: Friendly error messages with suggested fixes. Exit codes: 0 for success, 1 for user error, 2 for system error. --verbose flag for stack traces.
6. **Package Distribution**: Proper bin field in package.json. Shebang line. npx-compatible. Include man page or comprehensive --help output.

Tech stack: Node.js, Commander.js or yargs, Inquirer.js for prompts, chalk for colors.
Testing: Unit tests for core logic. Integration tests for CLI commands using execa.`,
    tags: ["cli", "terminal", "node", "command-line", "developer-tools"],
    difficulty: "intermediate",
    estimatedTime: "2-3 hours",
  },

  "discord-bot": {
    label: "Discord Bot",
    description:
      "A Discord bot with slash commands, event handlers, embeds, and database persistence.",
    basePrompt: `Build a Discord bot with these capabilities:

1. **Slash Commands**: Register 5-10 slash commands with proper descriptions, options, and autocomplete. Handle command interactions with deferred replies for slow operations.
2. **Event Handlers**: Listen for key events: messageCreate, guildMemberAdd, interactionCreate, ready. Modular handler files per event.
3. **Rich Embeds**: Format responses as Discord embeds with title, description, fields, color, thumbnail, and footer. Paginated embeds for long content with reaction-based navigation.
4. **Database Integration**: Store per-server configs (prefix, enabled features, mod roles). Store user data (points, levels, preferences). Use connection pooling.
5. **Moderation**: Kick, ban, mute, warn commands with permission checks. Audit log entries. Auto-mod rules for spam detection and link filtering.
6. **Scheduled Tasks**: Cron-based scheduled messages (daily summaries, reminders). Temporary bans with auto-unban. Recurring events.

Tech stack: discord.js v14, Node.js, SQLite or PostgreSQL, node-cron.
Deployment: Docker container or process manager (PM2). Environment variables for token and secrets.`,
    tags: ["discord", "bot", "chat", "moderation", "community"],
    difficulty: "intermediate",
    estimatedTime: "3-5 hours",
  },
};

// ── Keyword map for template suggestion ──

const KEYWORD_MAP: Record<string, string[]> = {
  "micro-saas": [
    "saas", "subscription", "billing", "stripe", "payment", "plan",
    "pricing", "recurring", "monthly", "startup", "mvp", "product",
  ],
  "landing-page": [
    "landing", "marketing", "hero", "cta", "conversion", "launch",
    "homepage", "waitlist", "coming soon", "announce", "promote",
  ],
  dashboard: [
    "dashboard", "analytics", "chart", "graph", "metrics", "admin",
    "data", "table", "report", "visualization", "monitor", "kpi",
  ],
  "api-backend": [
    "api", "backend", "rest", "graphql", "server", "endpoint",
    "route", "middleware", "database", "crud", "trpc",
  ],
  "mobile-app": [
    "mobile", "app", "ios", "android", "react native", "expo",
    "phone", "tablet", "native", "cross-platform",
  ],
  "chrome-extension": [
    "extension", "chrome", "browser", "plugin", "addon", "popup",
    "content script", "manifest", "toolbar",
  ],
  "cli-tool": [
    "cli", "command line", "terminal", "command", "script", "tool",
    "console", "shell", "npx", "binary",
  ],
  "discord-bot": [
    "discord", "bot", "chat", "slash command", "server", "guild",
    "moderation", "community",
  ],
};

// ── Utility Functions ──

/**
 * Build a complete prompt by combining a template with user customizations.
 * Merges the base prompt with tone, framework, extra features, and monetization preferences.
 */
export function buildPrompt(
  templateKey: string,
  customizations: PromptCustomization
): string {
  const template = PROMPT_TEMPLATES[templateKey];
  if (!template) {
    return `Error: Template "${templateKey}" not found.`;
  }

  const sections: string[] = [template.basePrompt];

  // Tone adjustment
  const toneMap: Record<PromptCustomization["tone"], string> = {
    casual:
      "Write all copy and comments in a casual, friendly tone. Use contractions and conversational language.",
    professional:
      "Use a professional, polished tone throughout. Formal but approachable language in all copy and documentation.",
    technical:
      "Use precise technical language. Include implementation details, type annotations, and architecture notes in comments.",
  };
  sections.push(`\n**Tone**: ${toneMap[customizations.tone]}`);

  // Framework override
  if (customizations.framework.trim()) {
    sections.push(
      `\n**Framework**: Use ${customizations.framework.trim()} as the primary framework. Adapt the architecture and file structure to its conventions.`
    );
  }

  // Extra features
  if (customizations.features.length > 0) {
    const featureList = customizations.features
      .map((f) => `- ${f}`)
      .join("\n");
    sections.push(
      `\n**Additional Features**:\n${featureList}`
    );
  }

  // Monetization
  if (customizations.monetization) {
    sections.push(
      `\n**Monetization**: Include a monetization layer. Add Stripe integration with a free tier and paid plans. Include pricing page, checkout flow, and webhook handling for subscription lifecycle events.`
    );
  }

  return sections.join("\n");
}

/**
 * Suggest relevant templates based on basic keyword matching against user input.
 * Returns suggestions sorted by relevance score (highest first).
 */
export function suggestTemplates(userInput: string): TemplateSuggestion[] {
  const input = userInput.toLowerCase().trim();
  if (!input) return [];

  const suggestions: TemplateSuggestion[] = [];

  for (const [key, keywords] of Object.entries(KEYWORD_MAP)) {
    let score = 0;
    for (const keyword of keywords) {
      if (input.includes(keyword)) {
        // Longer keyword matches are worth more
        score += keyword.length;
      }
    }

    // Also match against template tags
    const template = PROMPT_TEMPLATES[key];
    if (template) {
      for (const tag of template.tags) {
        if (input.includes(tag.toLowerCase())) {
          score += tag.length;
        }
      }
    }

    if (score > 0 && template) {
      suggestions.push({ key, template, score });
    }
  }

  return suggestions.sort((a, b) => b.score - a.score);
}

/**
 * Enhance a raw, unstructured prompt by adding best-practice sections.
 * Wraps the user's input with structured sections for tech stack, features,
 * constraints, and expected output format.
 */
export function enhancePrompt(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  const sections = [
    `## Project Description`,
    trimmed,
    ``,
    `## Tech Stack`,
    `- Framework: [Specify framework and version]`,
    `- Styling: Tailwind CSS with design tokens`,
    `- Database: [Specify database / ORM]`,
    `- Auth: [Specify auth provider]`,
    `- Deployment: [Specify deployment target]`,
    ``,
    `## Core Features`,
    `- [ ] Feature 1: [Describe the primary feature]`,
    `- [ ] Feature 2: [Describe the secondary feature]`,
    `- [ ] Feature 3: [Describe an additional feature]`,
    ``,
    `## Constraints`,
    `- Must be mobile-responsive`,
    `- Must handle loading and error states gracefully`,
    `- Must follow accessibility best practices (WCAG 2.1 AA)`,
    `- Must include proper TypeScript types (no \`any\`)`,
    `- Must include input validation and sanitization`,
    ``,
    `## Expected Output`,
    `- Complete, working code files with proper directory structure`,
    `- Type-safe implementations with exported interfaces`,
    `- Comments explaining non-obvious logic`,
    `- Environment variable references for secrets (never hardcoded)`,
  ];

  return sections.join("\n");
}
