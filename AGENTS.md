# Repository Guidelines

## Project Structure & Module Organization
- `app/` hosts App Router entries; keep page logic near the route folder for clarity.
- `components/` is the shared UI library. Group widgets by domain (`components/budget/`, `components/auth/`) and re-export as needed.
- `lib/` stores framework-agnostic helpers; `lib/supabase/` exposes Supabase clients and `lib/utils.ts` offers the Tailwind-friendly `cn()` helper.
- `styles/` holds Tailwind layer extensions, while `app/globals.css` carries global rules. Static assets belong in `public/` and Drizzle snapshots or migrations in `drizzle/`.

## Build, Test, and Development Commands
- `npm run dev` boots the Next.js dev server with hot reload.
- `npm run build` compiles the production bundle; run it before every PR.
- `npm run start` serves the compiled bundle for smoke tests.
- `npm run lint` runs the Next.js ESLint preset; commits should pass linting without overrides.
- `npm run db:generate` refreshes Drizzle snapshots, `npm run db:migrate` applies migrations, and `npm run db:studio` opens the schema explorer UI.

## Coding Style & Naming Conventions
- Author code in TypeScript with 2-space indentation and Prettier-compatible wrapping. Prefer functional React components and isolate side effects inside `useEffect` or server actions.
- Use `PascalCase` for exported components, `camelCase` for utilities, and `SCREAMING_SNAKE_CASE` for environment variables.
- Tailwind classes stay inline with JSX; share reusable combinations through helpers such as `cn()` rather than custom CSS.

## Testing Guidelines
- Playwright is the default E2E harness; place specs in `tests/e2e/*.spec.ts` and run them with `npx playwright test`. Stub Supabase calls with fixtures to keep runs deterministic.
- Cover the cash-flow happy path (create entry → list entries → view summary) plus error handling before merging feature work.

## Commit & Pull Request Guidelines
- Use Conventional Commit prefixes (`feat:`, `fix:`, `chore:`) plus a short imperative summary; keep language consistent within a change set.
- PRs should describe scope, call out database or environment updates, and link issues. Attach UI screenshots or clips for visible changes and note any follow-up tasks.

## Supabase & Environment Configuration
- Store secrets in `.env.local` and mirror keys with the expectations in `lib/supabase/client.ts`. Never commit generated `.env` files or Supabase service keys.
- After schema edits, update Drizzle models, rerun `npm run db:generate`, document manual Supabase console steps in `STORAGE_SETUP.md`, and verify migrations on a fresh database.
