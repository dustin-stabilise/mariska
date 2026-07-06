# SOP — Production release via Vercel CLI (no git integration)

- **Date:** 2026-07-06
- **Owner:** Dustin (or Claude on request)
- **When to run:** after any verified change that should go live. Pushing to
  GitHub does NOT deploy: the GitHub↔Vercel integration is intentionally not
  connected (Dustin's GitHub Login Connection is reserved for his other work
  Vercel account).

## Prerequisites

- Vercel CLI logged in to the account that owns `marsika-care/mariska`
  (check with `vercel whoami`; project alias is https://mariska-gray.vercel.app).
- Repo linked: `.vercel/project.json` present. If missing:
  `vercel link --yes --project mariska` and confirm the output says
  `Linked to marsika-care/mariska` before deploying anything.
- Working tree committed; `pnpm build` clean; verify suite green
  (`supabase start` + `pnpm seed` + `pnpm start` locally, then
  `node scripts/verify.mjs`).
- If the change includes a new file in `supabase/migrations/`, apply it to the
  production database FIRST (Supabase project `ttlbomxoqavgsayymauz`) via the
  Management API `database/query` endpoint, and insert the version row into
  `supabase_migrations.schema_migrations`. Deploying app code that expects
  tables the production DB doesn't have breaks production.

## Procedure

1. Commit (no Co-Authored-By trailers, explicit staging) and push to GitHub
   for history/sync: `git push origin main`.
2. Apply any new migration to production (see Prerequisites).
3. Deploy: `vercel deploy --prod --yes`
4. Wait for `"readyState": "READY"` and the
   `Aliased: https://mariska-gray.vercel.app` line in the output.

## Verification (mandatory)

- `curl -s -o /dev/null -w "%{http_code}" https://mariska-gray.vercel.app/`
  returns `200`.
- Spot-check whatever the release changed (a page's copy via `curl | grep`, a
  route's status code, or the relevant flow signed in as the demo admin).
- `vercel ls | head` shows the new deployment at the top with `● Ready` and
  environment `Production`.

## Common Failures (mandatory)

- **"Could not retrieve Project Settings"** → the local `.vercel/` link is
  stale. `rm -rf .vercel && vercel link --yes --project mariska`, confirm the
  scope is `marsika-care` (NOT the Stabilise team), then redeploy. Linking
  into the wrong scope silently creates a brand-new project with no env vars
  (this happened on 2026-07-06 and produced a broken `mariska-two.vercel.app`).
- **Deploy READY but pages 500** → env vars missing on the project (usually a
  wrong-scope link, see above). `vercel env ls production` should list
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
  `SUPABASE_SECRET_KEY`, `CRON_SECRET`, `PAYMENTS_ALLOW_TEST_BYPASS`.
- **App errors mentioning missing tables/columns** → migration wasn't applied
  to production before the deploy. Apply it via the Management API, no
  redeploy needed.
- **`git push` rejected (403)** → local credential lacks repo access; push is
  only for history and does not block the release. Deploy anyway, fix the
  GitHub credential separately.
- **Expired Supabase access token (Management API 401)** → mint a new personal
  access token in the Supabase dashboard (they auto-expire) and retry.
