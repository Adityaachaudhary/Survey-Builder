# Architecture & Design Decisions

A record of every non-trivial decision made in this project, with the reasoning behind each choice.

---

## 1. Runtime — Cloudflare Workers over a traditional Node server

**Decision:** Deploy the API as a Cloudflare Worker instead of a Node.js/Express server on a VPS or container.

**Why:**
- Workers run at the edge (300+ PoPs globally), so latency is low for any respondent filling in a public survey regardless of geography.
- No server to provision, patch, or scale. Cold starts are sub-millisecond (V8 isolates, not containers).
- D1 and KV are first-party Cloudflare products — bindings are injected directly into the Worker context with zero network hops between the API and its data stores.
- The free tier is generous enough to run this project indefinitely without a credit card.

**Trade-off:** Workers have a 128 MB memory limit and no filesystem. File uploads (logo images) can't be streamed to disk — they'd need R2. For this project, logo URLs are used instead (see decision #8).

---

## 2. Framework — Hono over Itty Router / native fetch handler

**Decision:** Use [Hono](https://hono.dev) as the HTTP framework on the Worker.

**Why:**
- Hono is built specifically for edge runtimes (Workers, Deno, Bun). It has zero Node.js dependencies.
- Middleware chaining (`app.use()`), typed context (`c.env`, `c.get()`), and grouped routes (`app.route()`) make the code readable without adding weight.
- First-class TypeScript support — `c.env` is typed via the `Env` interface in `types.ts`.
- Bundle size is ~14 KB. Itty Router is smaller but has no middleware story. Express doesn't run on Workers.

---

## 3. Database — Cloudflare D1 (SQLite) for survey data

**Decision:** Store users, surveys, questions, responses, and answers in D1.

**Why:**
- Survey data is inherently relational. A survey has many questions; a response has many answers; answers reference questions by foreign key. SQL joins and `ORDER BY` are the natural fit.
- D1 supports `db.batch()` for atomic multi-statement writes — used when inserting a response and all its answers together, so a partial write is impossible.
- SQLite's type system (TEXT, INTEGER, REAL, BLOB) is sufficient. No need for Postgres-level features at this scale.
- D1 is co-located with the Worker in Cloudflare's network, so reads are fast without a separate connection pool.

**Trade-off:** D1 is eventually consistent on reads in multi-region setups (though for a single-region free-tier deployment this is not observable). It also has a 10 GB storage limit on the free tier — more than enough for an MVP.

---

## 4. Sessions — Cloudflare KV over D1

**Decision:** Store session tokens in KV, not in a `sessions` table in D1.

**Why:**
- A session lookup is a pure key→value read: `session_id → user_id`. There is no query, no join, no ordering. KV is O(1) globally at the edge for this exact pattern.
- KV supports native TTL (`expirationTtl`). Setting a 30-day expiry is a single parameter — no cron job needed to purge expired rows.
- Keeping sessions out of D1 means the auth middleware never touches the relational database on every request, reducing D1 read units consumed.

**Trade-off:** KV is eventually consistent (changes propagate within ~60 seconds globally). For session invalidation (logout), there is a brief window where a revoked session could still be accepted at a distant PoP. Acceptable for this use case — this is not a banking app.

---

## 5. Auth — Email OTP over OAuth (Google/GitHub)

**Decision:** Implement a 6-digit email OTP flow via [Resend](https://resend.com) instead of OAuth.

**Why:**
- OAuth requires registering an app in a provider's developer console and configuring redirect URIs before anyone can run `pnpm dev`. That's friction for reviewers cloning the repo.
- The OTP flow is two API calls and a KV write. The entire auth implementation fits in ~80 lines and is easy to audit line by line.
- Resend's free tier (100 emails/day) is sufficient for a demo. The `onboarding@resend.dev` sender works without a verified domain in development.
- No user passwords to hash, store, or rotate. No OAuth token refresh logic.

**Trade-off:** Users must have access to their email to sign in. No "sign in with Google" convenience. Acceptable for a builder tool used by the survey owner, not anonymous respondents.

---

## 6. Drag-and-drop — @dnd-kit over react-beautiful-dnd

**Decision:** Use `@dnd-kit/sortable` for question reordering in the builder.

**Why:**
- `react-beautiful-dnd` has not had a meaningful release since 2022. It has unresolved issues with React 18 StrictMode (double-invocation of effects causes the drag state to break).
- `@dnd-kit` is actively maintained, tree-shakeable, and has first-class TypeScript types.
- The `useSortable` hook integrates cleanly with the existing `questions` state array — `arrayMove` + a PATCH API call is all that's needed.
- Supports both pointer and keyboard sensors out of the box (accessibility).

---

## 7. Optimistic updates in the builder

**Decision:** Apply question edits and reorders to local state immediately, then sync to the API in the background.

**Why:**
- The builder is an interactive editing tool. If every keystroke or drag waited for a round-trip to the Worker, the UI would feel sluggish and broken.
- The optimistic pattern is: update state → fire API call → on error, roll back state and show a toast. This gives instant feedback with a safe fallback.
- The risk of a rollback is low (network errors are rare on localhost; the Worker is stateless and fast).

**Trade-off:** If the API call fails silently (e.g., the user is offline), the UI shows state that doesn't match the database until the next page load. The toast notification mitigates this by making failures visible.

---

## 8. Logo storage — URL input over file upload (R2)

**Decision:** Accept a logo URL string instead of uploading image files to Cloudflare R2.

**Why:**
- Cloudflare R2 requires a payment method on file even for the free tier. This creates a hard blocker for reviewers who want to run the project locally without entering billing details.
- A URL input works for 100% of real-world use cases (paste a CDN link, a GitHub raw URL, or a public image URL).
- The schema (`logo_url TEXT`) is identical whether the value is a user-pasted URL or an R2 public URL. Adding R2 upload later requires only a new API endpoint — no schema migration.

---

## 9. Multi-select answers — `|||`-delimited string over a join table

**Decision:** Store multiple-choice answers as a single `value` column with `|||` as the delimiter, rather than one row per selected option.

**Why:**
- The answers table already has one row per question per response. Adding a sub-table for multi-select values would require a three-way join to reconstruct a single answer.
- At this scale (MVP, no pagination), the simpler schema wins. Splitting on `|||` in application code is two lines.
- The delimiter `|||` is chosen because it cannot appear in normal survey option text (unlike commas, semicolons, or pipes).

**Trade-off:** Querying "how many respondents selected option X" requires a `LIKE '%|||X|||%'` pattern match in SQL, which is not index-friendly. For the current analytics implementation (all answers are fetched and aggregated in JavaScript), this is not a problem. If SQL-level aggregation were needed, a join table would be the right call.

---

## 10. State management — local useState over Redux/Zustand

**Decision:** Use React's built-in `useState` and `useCallback` for all component state. No global store.

**Why:**
- The app has three main routes (dashboard, builder, responses). There is no state that needs to be shared across routes simultaneously.
- Each page fetches its own data on mount and owns its state locally. TanStack Router's file-based route structure makes this natural.
- Adding Zustand or Redux would introduce a store, actions, and selectors for data that is already co-located with the component that uses it. That's complexity with no benefit.

**Trade-off:** If the app grew to have cross-route shared state (e.g., a global notification center, or a survey being edited in multiple tabs), a store would become necessary. The current architecture makes that refactor straightforward — extract `useState` into a store slice.

---

## 11. Styling — Tailwind CSS + shadcn/ui over a component library

**Decision:** Use Tailwind utility classes for layout/spacing and shadcn/ui for interactive primitives (Button, Input, Dialog, Switch, Toast).

**Why:**
- shadcn/ui components are copied into the project (not installed as a dependency). They are fully owned, customizable, and don't add a versioned peer dependency to manage.
- Tailwind's utility-first approach means there is no CSS file to maintain. All styles are co-located with the markup.
- No design system lock-in. Swapping a color or border radius is a one-line change in `tailwind.config.js` or `index.css`.

**Trade-off:** Tailwind class strings can get long. Biome's formatter keeps them consistent, and the `cn()` utility (clsx + tailwind-merge) handles conditional class merging cleanly.

---

## 12. Linting/formatting — Biome over ESLint + Prettier

**Decision:** Use [Biome](https://biomejs.dev) as the single tool for both formatting and linting.

**Why:**
- Biome replaces both ESLint and Prettier with a single binary. One config file (`biome.json`), one command (`pnpm check`).
- It is significantly faster than ESLint + Prettier (written in Rust, runs in parallel).
- No plugin ecosystem to manage. The rules used (`recommended` + a few overrides) are stable and well-documented.

**Trade-off:** Biome's rule set is smaller than ESLint's plugin ecosystem. If a very specific lint rule were needed (e.g., a custom accessibility plugin), ESLint would be required. Not a concern for this project.

---

## 13. Public survey slug — random nanoid over sequential IDs

**Decision:** Generate a short random slug (e.g., `abc123xy`) for each survey's public URL instead of using the database row ID.

**Why:**
- Sequential integer IDs expose the total number of surveys in the system and make enumeration trivial (`/s/1`, `/s/2`, ...).
- A random slug is unguessable without being shared. It acts as a lightweight access token for the public survey URL.
- Slugs are human-readable in the URL bar, which looks more professional than a UUID.

---

## 14. No pagination on survey list and response list

**Decision:** Return all surveys and all responses in a single query, with no `LIMIT/OFFSET`.

**Why:**
- This is an MVP. A user is unlikely to have more than a few dozen surveys or a few hundred responses during the evaluation period.
- Adding pagination requires UI controls (page numbers or infinite scroll), loading state for page transitions, and cursor/offset logic in the query layer. That's scope that doesn't demonstrate anything new.
- The query layer (`queries.ts`) is structured so that adding `LIMIT` and `OFFSET` parameters is a one-line change per query when needed.
