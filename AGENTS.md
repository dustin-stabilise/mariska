<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# How We Work

The four Core Rules below are always in force. The full methodology (task arc,
memory discipline, knowledge records) lives in the `how-we-work` skill — invoke
it to re-anchor. If the skill and this file ever disagree, this file wins.

## The Four Core Rules

1. **Think Before Coding.** No silent assumptions — state them. Surface
   tradeoffs. Ask before guessing. Push back when a simpler approach exists.
2. **Simplicity First.** Minimum code that solves the problem. No speculative
   features. No abstractions for single-use code.
3. **Surgical Changes.** Touch only what you must. Don't "improve" adjacent
   code, comments, or formatting. Match existing style.
4. **Goal-Driven Execution.** Propose concrete, testable success criteria and
   confirm them *before* iterating; then loop autonomously until verified.

Questions belong at task *boundaries*: ask upfront to lock success criteria,
then work without pausing mid-task.

## Pre-Commit Review Checklist

Run against **every changed file** before declaring anything done:

- **Crash safety.** No unchecked nulls/indexing in production paths. Fail
  gracefully; surface errors to the UI.
- **No debug logging.** No stray `console.log`. Never log secrets, PII, or tokens.
- **Build cleanly** (`pnpm build`) before declaring done. "It compiles" is not
  "it works" — run the affected flow.
- **Secrets stay server-side.** Never commit `.env*`; stage files explicitly
  (no `git add -A`). The Supabase service-role key and Stripe secret key must
  never reach client code.
- **Root-caused, not symptom-patched.** The fix names the actual cause.

Project-specific (grow this list every time something breaks):

- Every new Supabase table ships with RLS policies in the same migration.
- The Stripe test bypass must be gated so it cannot activate in production.

## Git

- Commit and push **only when asked**. Branch before committing on `main`.
- No `Co-Authored-By` trailers in commit messages.

## Knowledge Records

Lasting decisions → `Docs/decisions/` via `/decision`. Repeatable procedures →
`Docs/sops/` via `/sop`. Fill templates only with facts from the repo or the
human; leave unknowns blank and mark ambiguity `[UNCLEAR]`.

## Memory

After any user correction, save a `feedback` memory (with the why) so the
mistake can't recur. Prefer explicit saves over silent ones. Don't save what
the repo already records.
