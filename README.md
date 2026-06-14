# Survey Builder

A full-stack branded survey builder — a minimal Typeform/Tally clone built with Hono on Cloudflare Workers, React + Vite + TanStack Router, and Cloudflare D1/KV/R2.

## Stack

| Layer | Technology |
|---|---|
| Backend | Hono on Cloudflare Workers |
| Frontend | React 18 + Vite + TanStack Router |
| Database | Cloudflare D1 (SQLite) |
| Sessions | Cloudflare KV |
| File storage | Cloudflare R2 (logo uploads) |
| Auth | Email OTP via Resend |
| Language | TypeScript throughout |
| Styling | Tailwind CSS + shadcn/ui |
| Drag-and-drop | @dnd-kit/core |
| Linting | Biome |

## Features

- **Auth** — Email OTP via Resend. Enter your email, get a 6-digit code, sign in. Sessions stored in KV with 30-day TTL.
- **Survey builder** — Create surveys with 5 question types: short text, long text, multiple choice, single choice, rating (1–5). Add, remove, and drag-to-reorder questions. Inline editing with optimistic updates.
- **Branding** — Per-survey primary color (12 presets + custom picker) and logo (URL or R2 upload). Live preview in the builder sidebar.
- **Public survey page** — Shareable `/s/:slug` URL. Renders in the owner's brand. No sign-in required to respond. Validates required questions before submission.
- **Responses dashboard** — Individual view (expand each response) and summary view (bar charts for ratings and choice questions, text answers listed). CSV export.

## Getting started

### Prerequisites

- Node.js 18+
- pnpm (`npm install -g pnpm`)
- A Cloudflare account (free tier works)
- A Resend account + API key (free tier: 3,000 emails/month)

### 1. Install dependencies

```bash
pnpm install
```

### 2. Create Cloudflare resources

```bash
# Authenticate
npx wrangler login

# Create D1 database
npx wrangler d1 create survey-builder-db
# → copy the database_id into api/wrangler.jsonc

# Create KV namespace
npx wrangler kv namespace create SESSIONS
# → copy the id into api/wrangler.jsonc

# Create R2 bucket
npx wrangler r2 bucket create survey-builder-logos
```

### 3. Run D1 migrations

```bash
cd api
npx wrangler d1 migrations apply survey-builder-db --local
# For production:
# npx wrangler d1 migrations apply survey-builder-db --remote
```

### 4. Set secrets

```bash
cd api
npx wrangler secret put RESEND_API_KEY
# Paste your Resend API key when prompted
```

Update `api/wrangler.jsonc`:
- Replace `YOUR_D1_DATABASE_ID` with your D1 database ID
- Replace `YOUR_KV_NAMESPACE_ID` with your KV namespace ID
- Update `FRONTEND_URL` for production

### 5. Update Resend sender

In `api/src/routes/auth.ts`, update the `from` field:
```ts
from: "Survey Builder <noreply@yourdomain.com>",
```
Your domain must be verified in Resend. For testing, use `onboarding@resend.dev` and send only to your own email.

### 6. Run locally

```bash
# From the root
pnpm dev
```

- Frontend: http://localhost:5173
- API: http://localhost:8787

### 7. Deploy to Cloudflare

```bash
cd api && npx wrangler deploy
cd ../web && pnpm build
# Deploy web/dist to Cloudflare Pages or any static host
```

## Project structure

```
survey-builder/
├── api/                          # Hono backend (Cloudflare Workers)
│   ├── migrations/
│   │   └── 0001_initial_schema.sql
│   ├── src/
│   │   ├── db/
│   │   │   └── queries.ts        # All D1 query helpers
│   │   ├── middleware/
│   │   │   └── auth.ts           # Session cookie middleware
│   │   ├── routes/
│   │   │   ├── auth.ts           # OTP send/verify, /me, logout
│   │   │   ├── surveys.ts        # Survey + question CRUD (authed)
│   │   │   └── public.ts         # Public survey fetch + response submit
│   │   ├── index.ts              # Hono app entry, CORS, routing
│   │   └── types.ts              # Env bindings interface
│   ├── wrangler.jsonc
│   └── package.json
│
└── web/                          # React + Vite frontend
    ├── src/
    │   ├── components/
    │   │   ├── auth/
    │   │   │   └── LoginPage.tsx       # Email → OTP → dashboard
    │   │   ├── builder/
    │   │   │   ├── BuilderPage.tsx     # Main builder (DnD, tabs)
    │   │   │   ├── QuestionCard.tsx    # Sortable question editor
    │   │   │   └── BrandingPanel.tsx   # Color + logo panel
    │   │   ├── dashboard/
    │   │   │   ├── DashboardPage.tsx   # Survey list
    │   │   │   └── ResponsesPage.tsx   # Response viewer
    │   │   ├── survey/
    │   │   │   ├── PublicSurveyPage.tsx # Respondent view
    │   │   │   └── ThankYouPage.tsx    # Post-submission
    │   │   └── ui/                    # shadcn/ui components
    │   ├── hooks/
    │   │   ├── useAuth.tsx            # Auth context + hook
    │   │   └── useToast.ts            # Toast state
    │   ├── lib/
    │   │   ├── api.ts                 # Typed fetch client
    │   │   └── utils.ts               # cn() helper
    │   ├── routes/                    # TanStack Router file routes
    │   └── main.tsx
    └── package.json
```

## Architecture decisions

### Why D1 for surveys, KV for sessions?
Survey data is relational — surveys have questions, questions have answers, responses join both. D1 (SQLite) gives proper foreign keys, joins, and ordering in one `db.batch()` call. Sessions are a pure key→value lookup with TTL; KV is a perfect fit and avoids a round-trip SQL query on every authed request.

### Why email OTP over OAuth?
No third-party dependency at runtime. The flow is two API calls and a KV write — easy to audit, easy to explain. OAuth would require setting up an app in a provider's dashboard before the reviewer can even run `pnpm dev`.

### Why @dnd-kit over react-beautiful-dnd?
`react-beautiful-dnd` is no longer actively maintained and has known React 18 StrictMode issues. `@dnd-kit` is actively maintained, smaller, and has first-class TypeScript support.

### Question reordering — why optimistic updates?
The builder UX should feel instant. Reorder calls are fire-and-forget with a rollback on error. The same pattern is used for question edits — local state updates immediately, API call happens in the background.

### Multiple choice encoding
Multi-select answers are stored as a `|||`-delimited string in a single `value` column rather than multiple rows. This keeps the schema simple (one answer per question per response) at the cost of needing a split on read. For this scale, that tradeoff is correct.

## Linting

```bash
pnpm check        # biome check
pnpm check:fix    # auto-fix
pnpm typecheck    # tsc --noEmit across both packages
```

## What I'd do with another week

1. **Font picker** — let owners pick a Google Font for their survey, stored as `font_family` on the survey. One `<link>` tag in the public page head.
2. **Branching logic** — conditional question visibility based on previous answers. The schema already supports it; it needs a `conditions` JSON column on questions and a client-side evaluator.
3. **Real-time response notifications** — Cloudflare Durable Objects or a webhook on response submission.
4. **Better empty states and error boundaries** — the current error handling is functional but not delightful.
