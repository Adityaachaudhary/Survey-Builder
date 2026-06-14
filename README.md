# Survey Builder

A full-stack branded survey builder — a minimal Typeform/Tally clone built for the DoCoDeGo SDE Intern assignment.

Built with Hono on Cloudflare Workers, React + Vite + TanStack Router, and Cloudflare D1/KV for persistence.

---

## Live Demo

> Record your Loom link here after submission

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Backend | Hono on Cloudflare Workers | Lightweight, edge-native, first-class TypeScript support. Fits Cloudflare's ecosystem perfectly. |
| Frontend | React 18 + Vite | Fast DX, industry standard, pairs well with TanStack Router |
| Routing | TanStack Router | File-based, fully type-safe, client-side only as required |
| Database | Cloudflare D1 (SQLite) | Survey data is relational — surveys have questions, responses have answers. SQL joins and ordering are the right tool. |
| Sessions | Cloudflare KV | Sessions are pure key→value with TTL. KV is faster and simpler than a SQL lookup on every request. |
| Auth | Email OTP via Resend | No third-party OAuth dependency. Two API calls and a KV write — easy to audit, easy to explain, works on free tier. |
| Drag and drop | @dnd-kit/core | Actively maintained, React 18 StrictMode compatible. react-beautiful-dnd is abandoned and has known React 18 bugs. |
| Styling | Tailwind CSS + shadcn/ui | Utility-first with accessible, unstyled primitives. No design system lock-in. |
| Language | TypeScript (both sides) | End-to-end type safety. Shared mental model between frontend and backend. |
| Linting | Biome | Single tool for formatting + linting. Faster than ESLint + Prettier combined. |

---

## Features

### MVP (all completed)
- **Auth** — Email OTP flow. Enter email → receive 6-digit code → sign in. Sessions stored in KV with 30-day TTL.
- **Survey Builder** — 5 question types: short text, long text, multiple choice, single choice, rating (1–5). Add, remove, drag-to-reorder questions. Inline editing with optimistic updates.
- **Branding** — Per-survey primary color (12 presets + custom hex picker) and logo (URL input). Live preview in the builder sidebar.
- **Public Survey Page** — Shareable `/s/:slug` URL renders in the owner's brand colors and logo. No sign-in required to fill in.
- **Anonymous Response Submission** — Responses persisted server-side in D1. Required question validation before submit.
- **Owner Dashboard** — List all surveys with response counts, creation date, active status. One-click to builder or responses.
- **Response Viewer** — Two views: Individual (expand each response) and Summary (bar charts for ratings and choices, text answers listed). CSV export.

### Stretch (completed)
- Long text question type
- Single choice question type (radio)
- Response analytics (counts, averages, per-question breakdowns)
- CSV export of all responses

---

## Architecture Decisions

### Why email OTP over OAuth?
OAuth requires setting up an app in a provider's dashboard (Google, GitHub, etc.) before anyone can even run `pnpm dev`. OTP needs just a Resend API key. The flow is two API calls and a KV write — simple to audit, simple to explain line by line. For an intern assignment where reviewers clone and run locally, fewer external dependencies is a strict win.

### Why D1 for surveys, KV for sessions?
Survey data is relational. Surveys have questions, questions have options, responses have answers — these are joins. D1 (SQLite) gives proper foreign keys, `ORDER BY`, and `db.batch()` for atomic multi-row writes. Sessions are a pure key→value lookup with TTL — KV handles that in a single read with no schema.

### Why @dnd-kit over react-beautiful-dnd?
`react-beautiful-dnd` hasn't had a meaningful release since 2022 and has unresolved React 18 StrictMode issues. `@dnd-kit` is actively maintained, smaller (tree-shakeable), has first-class TypeScript support, and works correctly in React 18 StrictMode without workarounds.

### Why optimistic updates in the builder?
The builder UX should feel instant. When you edit a question label or reorder cards, the UI updates immediately — the API call happens in the background. If it fails, state rolls back and a toast explains why. This is the right tradeoff for a builder tool where latency would kill the feel.

### Why multiple choice answers stored as `|||`-delimited strings?
Multi-select answers are stored as a single `value` column rather than multiple rows. This keeps the schema simple — one answer per question per response — and avoids a join to reconstruct a single answer. At this scale that tradeoff is correct. The delimiter `|||` is chosen because it won't appear in normal user input.

### Why no Redux or Zustand?
Three routes, no shared cross-route state that couldn't live in a component or be refetched. Adding a global store would be complexity for no benefit. TanStack Router's loader pattern + local `useState` is enough.

---

## Assumptions

- **Logo uploads skipped** — Cloudflare R2 requires a payment method even for the free tier. Logo URLs (paste a link) work fully. R2 upload can be added later without schema changes.
- **Email sender** — Using `onboarding@resend.dev` for local dev (Resend's test address). In production, replace with a verified domain.
- **Single workspace** — One user per email, no teams or sharing of surveys between accounts.
- **No pagination** — Survey list and response list are unpaginated. Fine for an MVP; add `LIMIT/OFFSET` in the query layer when needed.
- **Public surveys only** — All active surveys are publicly accessible via their slug. No password protection or private surveys in this version.

---

## Folder Structure

```
survey-builder/
├── biome.json                          # Biome config — formatting + linting
├── package.json                        # Root workspace scripts
├── pnpm-workspace.yaml                 # pnpm workspace definition
├── pnpm-lock.yaml                      # Lockfile (committed)
├── setup.sh                            # One-shot setup script
│
├── api/                                # Hono backend (Cloudflare Workers)
│   ├── wrangler.jsonc                  # Worker config — D1, KV bindings
│   ├── package.json
│   ├── tsconfig.json
│   ├── migrations/
│   │   └── 0001_initial_schema.sql    # D1 schema — all 5 tables
│   └── src/
│       ├── index.ts                   # Hono app entry — CORS, logger, route mounting
│       ├── types.ts                   # Env interface (D1, KV, Resend key)
│       ├── middleware/
│       │   └── auth.ts               # Session cookie verification middleware
│       ├── db/
│       │   └── queries.ts            # All D1 typed query helpers (users, surveys, questions, responses)
│       └── routes/
│           ├── auth.ts               # POST send-otp, POST verify-otp, GET me, POST logout
│           ├── surveys.ts            # Survey CRUD + question CRUD (all auth-gated)
│           └── public.ts             # GET /s/:slug, POST /s/:slug/respond, GET responses
│
└── web/                               # React + Vite frontend
    ├── index.html
    ├── vite.config.ts                 # Vite + TanStack Router plugin + /api proxy
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── tsconfig.json
    ├── package.json
    └── src/
        ├── main.tsx                   # React root, RouterProvider
        ├── index.css                  # Tailwind directives + CSS variables
        ├── routeTree.gen.ts           # Auto-generated route tree
        ├── lib/
        │   ├── api.ts                # Typed fetch client — all API calls + shared types
        │   └── utils.ts              # cn() helper for Tailwind class merging
        ├── hooks/
        │   ├── useAuth.tsx           # Auth context — user state, login, logout
        │   └── useToast.ts           # Toast notification state
        ├── routes/                    # TanStack Router file-based routes
        │   ├── __root.tsx            # Root layout — AuthProvider + Toaster
        │   ├── index.tsx             # / — redirects to dashboard or login
        │   ├── dashboard.tsx         # /dashboard — auth-gated
        │   ├── builder.$surveyId.tsx # /builder/:id — auth-gated
        │   ├── responses.$surveyId.tsx # /responses/:id — auth-gated
        │   ├── s.$slug.tsx           # /s/:slug — public, no auth
        │   ├── s.$slug.done.tsx      # /s/:slug/done — thank you page
        │   └── 404.tsx               # 404 fallback
        └── components/
            ├── ui/                   # shadcn/ui primitives
            │   ├── button.tsx
            │   ├── input.tsx
            │   ├── primitives.tsx    # Label, Textarea, Card, Badge, Separator
            │   ├── dialog.tsx
            │   ├── controls.tsx      # Switch, DropdownMenu
            │   ├── toast.tsx
            │   └── toaster.tsx
            ├── auth/
            │   └── LoginPage.tsx     # Email input → OTP input → session
            ├── builder/
            │   ├── BuilderPage.tsx   # Main builder — DnD context, tabs, preview panel
            │   ├── QuestionCard.tsx  # Sortable card — type switcher, label, options, required toggle
            │   └── BrandingPanel.tsx # Color presets + hex picker + logo URL input
            ├── dashboard/
            │   ├── DashboardPage.tsx # Survey list with response counts
            │   └── ResponsesPage.tsx # Individual + summary view + CSV export
            └── survey/
                ├── PublicSurveyPage.tsx # Branded respondent view — all 5 question types
                └── ThankYouPage.tsx     # Post-submission confirmation
```

---

## Database Schema

```sql
-- Users — one row per email address
users (id, email, created_at)

-- Surveys — owned by a user, has a unique public slug
surveys (id, user_id, title, description, slug, primary_color, logo_url, is_active, created_at, updated_at)

-- Questions — ordered list belonging to a survey
questions (id, survey_id, type, label, required, options, order_index, created_at)
-- type: short_text | long_text | multiple_choice | single_choice | rating
-- options: JSON array string for choice questions, NULL otherwise

-- Responses — one row per survey submission (anonymous)
responses (id, survey_id, submitted_at)

-- Answers — one row per question answered per response
answers (id, response_id, question_id, value)
-- value: plain string for text/rating, "|||"-delimited for multiple_choice
```

---

## API Routes

### Auth (no auth required)
| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/send-otp` | Send 6-digit OTP to email via Resend |
| POST | `/api/auth/verify-otp` | Verify OTP, create session cookie |
| GET | `/api/auth/me` | Get current user from session |
| POST | `/api/auth/logout` | Delete session |

### Surveys (auth required)
| Method | Path | Description |
|---|---|---|
| GET | `/api/surveys` | List own surveys with response counts |
| POST | `/api/surveys` | Create survey |
| GET | `/api/surveys/:id` | Get survey + questions |
| PUT | `/api/surveys/:id` | Update survey (title, branding, etc.) |
| DELETE | `/api/surveys/:id` | Delete survey + cascade |
| POST | `/api/surveys/:id/questions` | Add question |
| PUT | `/api/surveys/questions/:id` | Update question |
| DELETE | `/api/surveys/questions/:id` | Delete question |
| PATCH | `/api/surveys/:id/reorder` | Reorder questions (batch update) |

### Public (no auth required)
| Method | Path | Description |
|---|---|---|
| GET | `/api/s/:slug` | Fetch public survey + questions |
| POST | `/api/s/:slug/respond` | Submit anonymous response |
| GET | `/api/s/survey/:id/responses` | Get all responses (auth required) |

---

## Prerequisites

- **Node.js** v18 or higher — https://nodejs.org
- **pnpm** — `npm install -g pnpm`
- **Wrangler** — `npm install -g wrangler`
- **Cloudflare account** (free) — https://cloudflare.com
- **Resend account** (free) — https://resend.com

---

## Setup & Running Locally

### 1. Install dependencies
```bash
pnpm install
pnpm approve-builds
```

### 2. Authenticate with Cloudflare
```bash
npx wrangler login
```

### 3. Create Cloudflare resources

**D1 database:**
```bash
npx wrangler d1 create survey-builder-db
```
Copy the `database_id` from the output.

**KV namespace:**
```bash
npx wrangler kv namespace create SESSIONS
```
Copy the `id` from the output.

### 4. Update api/wrangler.jsonc
Replace the two placeholder values with your real IDs:
```json
"database_id": "YOUR_ACTUAL_D1_ID_HERE",
...
"id": "YOUR_ACTUAL_KV_ID_HERE"
```

### 5. Run D1 migrations
```bash
cd api
npx wrangler d1 migrations apply survey-builder-db --local
cd ..
```

### 6. Set up Resend
- Go to https://resend.com → sign up → API Keys → Create API Key
- Copy the key (starts with `re_...`)

```bash
cd api
npx wrangler secret put RESEND_API_KEY
# paste your key when prompted
cd ..
```

### 7. Create local secrets file
Create `api/.dev.vars` with:
```
RESEND_API_KEY=re_your_actual_key_here
```
This makes the key available in local dev (wrangler secrets only apply in production).

### 8. Update sender email
Open `api/src/routes/auth.ts` and update:
```ts
from: "Survey Builder <onboarding@resend.dev>",
```
For production replace with your verified Resend domain.

### 9. Run
```bash
pnpm dev
```
- Frontend: http://localhost:5173
- API: http://localhost:8787

---

## All Available Commands

```bash
# Development
pnpm dev              # Run api + web together (with prefixed output)

# Quality checks (must pass before submission)
pnpm check            # Biome — formatting + linting
pnpm check:fix        # Auto-fix everything Biome can fix
pnpm typecheck        # tsc --noEmit across both packages

# Production build
pnpm build            # Build web/dist for deployment

# Cloudflare
npx wrangler deploy   # Deploy API to Cloudflare Workers (from api/ folder)
npx wrangler d1 migrations apply survey-builder-db --local   # Local DB migrations
npx wrangler d1 migrations apply survey-builder-db --remote  # Production DB migrations
npx wrangler secret put RESEND_API_KEY                       # Set production secret
```

---

## Deploying to Cloudflare (stretch)

**API:**
```bash
cd api
npx wrangler deploy
npx wrangler d1 migrations apply survey-builder-db --remote
```

**Frontend:**
```bash
pnpm build
# Deploy web/dist to Cloudflare Pages via dashboard or:
npx wrangler pages deploy web/dist --project-name survey-builder-web
```

Update `FRONTEND_URL` in `api/wrangler.jsonc` to your Pages URL before deploying the API.

---

## AI Tools Used

This project was built with Claude (Anthropic) as the primary AI assistant.

**Where AI helped:**
- Scaffolding the initial file structure and boilerplate
- Writing the D1 query helpers and TypeScript generics
- shadcn/ui component setup
- Debugging TypeScript errors across the workspace

**Where I had to understand and own it:**
- All architecture decisions (D1 vs KV, OTP vs OAuth, dnd-kit choice)
- Debugging the Biome linting pass — understanding each rule and why it fired
- The `.dev.vars` local secrets setup — not in the generated code, figured out from wrangler docs
- Fixing the `pnpm approve-builds` issue on Windows
- Understanding every route, every query, every component — required since the interview will ask

Every file in this repo has been read, understood, and is defensible line by line.

---

## What I'd Do With Another Week

1. **Font picker** — let owners choose a Google Font for their survey. The schema already has `primary_color`; adding `font_family` is one column and one `<link>` tag on the public page.
2. **Branching / conditional questions** — show/hide questions based on previous answers. The DB schema supports it with a `conditions` JSON column on questions; needs a client-side evaluator.
3. **Real-time response counter** — live update the dashboard response count when a new submission comes in, using Cloudflare Durable Objects or polling.
4. **Better error boundaries** — currently errors surface as toasts; proper React error boundaries per route would be more resilient.
5. **Logo file upload** — needs Cloudflare R2 with a payment method on the account. The route handler was written and then removed; adding it back is straightforward once R2 is enabled.
