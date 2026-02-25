# MetaVibeCoder

> S+++ meta-vibe-coding tool — optimize prompts, orchestrate agents, ship better code.

A personal AI-powered coding assistant built with **Next.js 15**, **Supabase**, and **LangGraph**. Bring your own API keys (BYOK) for Anthropic, OpenRouter, Groq, or OpenAI.

## Features

- **Prompt Optimizer** — Transform vague ideas into production-grade prompts with 6 strategies
- **Agent Swarm** — Multi-agent critique from 4 specialist perspectives (Architecture, Security, UX, Performance)
- **Auto-Iterate** — Automated critique → test → preview → vibe-check → refine loops
- **Code Critique** — Detailed code review with severity scoring
- **Memory Vault** — pgvector-powered context that auto-enriches prompts
- **Tool Belt** — Export to v0, Replit, CodeSandbox, StackBlitz, GitHub Gist
- **Analytics Dashboard** — Track usage patterns and improvement suggestions
- **Remote Control** — Start tasks on laptop, review/approve from phone via QR code
- **VS Code Extension** — IDE integration with command palette
- **CLI** — Terminal interface for all features

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, Turbopack) |
| Auth & DB | Supabase (Auth, Postgres, pgvector, pgcrypto) |
| AI Orchestration | LangGraph.js (StateGraph) |
| LLM Provider | BYOK via OpenAI SDK (universal client) |
| Styling | Tailwind CSS v4 |
| Charts | Recharts |
| Rate Limiting | Upstash Redis |

## Local Development

### Prerequisites

- Node.js 18+
- A Supabase project (free tier works)
- At least one LLM API key (Anthropic recommended)

### Setup

```bash
# Clone
git clone https://github.com/kinggkoopa/VibeCheck.git
cd VibeCheck

# Install dependencies
npm install

# Copy environment template
cp .env.local.example .env.local
# Fill in your Supabase URL, anon key, and service role key

# Run database migrations
npm run db:migrate

# Start dev server (with Turbopack)
npm run dev
```

### Environment Variables

```env
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Upstash Redis — rate limiting (optional, recommended)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token

# Sentry — error tracking (optional)
SENTRY_DSN=https://your-dsn@sentry.io/project-id

# LLM keys are stored encrypted in Supabase, not in env
```

### Scripts

```bash
npm run dev          # Start dev server with Turbopack
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint
npm run test         # Jest tests
npm run db:migrate   # Push Supabase migrations
npm run db:types     # Generate TypeScript types from Supabase schema
```

## Deploy to Vercel (Hobby Tier)

1. Push to GitHub
2. Import project in [Vercel Dashboard](https://vercel.com/new)
3. Set environment variables in Vercel project settings
4. Deploy — the build runs `next build` automatically

### Vercel Hobby Tier Notes

- Serverless function timeout: 10s (sufficient for single LLM calls)
- For long-running swarm operations, consider upgrading or using edge functions
- Turbopack is dev-only; production builds use the standard Next.js compiler
- Image optimization is included (10K/month on Hobby)

## VS Code Extension

```bash
cd vscode-extension
npm install
# Open in VS Code and press F5 to launch Extension Development Host
```

Commands:
- `Meta Vibe: Critique Current File` — Full code review
- `Meta Vibe: Optimize Prompt` — Prompt optimization
- `Meta Vibe: Run Swarm on Selection` — Multi-agent critique
- `Meta Vibe: Auto-Iterate on Selection` — Iterative improvement

## CLI

```bash
cd cli
npx ts-node index.ts help

# Examples
npx ts-node index.ts optimize "build a habit tracker with AI coaching"
npx ts-node index.ts critique src/app/page.tsx
npx ts-node index.ts iterate src/lib/utils.ts --max 3
npx ts-node index.ts swarm "design a real-time notification system"
```

Set `ANTHROPIC_API_KEY` in your environment or `.env.local`.

## Architecture

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Login/signup pages
│   ├── (dashboard)/        # Protected dashboard pages
│   └── api/                # Route handlers
├── components/             # React components
├── core/
│   ├── agents/             # LangGraph agent definitions
│   └── llm/                # Provider factory + models
├── db/                     # Database helpers (memory/embeddings)
├── features/               # Feature-specific server actions
├── hooks/                  # Custom React hooks
├── lib/                    # Shared utilities
│   ├── cache.ts            # In-memory LRU cache
│   ├── crypto/             # pgcrypto key encryption
│   ├── monitoring.ts       # AI latency tracking
│   ├── security.ts         # Rate limiting + validation
│   └── supabase/           # Supabase clients (server/client/admin)
└── types/                  # TypeScript type definitions
```

## Security

- All API keys encrypted at rest with pgcrypto
- CSRF double-submit cookie pattern on all API routes
- Rate limiting via Upstash Redis (30 req/60s API, 10 req/60s LLM)
- Input size validation (code: 100KB, prompt: 50KB)
- Security headers: CSP, HSTS, X-Frame-Options, etc.
- No service_role key exposed to client-side code

## License

MIT
