---
name: how-we-work
description: The CareMatch working methodology — invoke when starting a non-trivial task to re-anchor on the working contract, when running the pre-commit review, or when onboarding/handing off. Covers the four Core Rules (think-before-coding, simplicity, surgical changes, goal-driven execution), the task arc, the pre-commit checklist, memory discipline, and knowledge records. Trigger on "methodology", "how we work", "pre-commit review", "task kickoff", "lock success criteria", "review checklist before commit".
---

# How We Work — CareMatch (mariska)

This is the working contract for this repo. It mirrors `AGENTS.md`; if they
ever disagree, `AGENTS.md` wins and this skill gets updated to match.

## The Four Core Rules

1. **Think Before Coding.** No silent assumptions — state what you're
   assuming. Surface tradeoffs. Ask before guessing. Push back when a simpler
   approach exists.
2. **Simplicity First.** Minimum code that solves the problem. No speculative
   features. No abstractions for single-use code. If a senior engineer would
   call it overcomplicated — simplify.
3. **Surgical Changes.** Touch only what you must. Don't "improve" adjacent
   code, comments, or formatting. Don't refactor what isn't broken. Match
   existing style.
4. **Goal-Driven Execution.** Define concrete, testable success criteria
   upfront — propose them and confirm *before* iterating. Loop until verified.
   Pursue the outcome, not prescribed steps.

**Reconciling 1 and 4:** questions belong at task *boundaries*. Ask upfront to
lock success criteria; then iterate autonomously until verified rather than
pausing mid-task.

## The Task Arc

Every non-trivial task runs the same arc:

1. **Kickoff (Rules 1 & 4).** State assumptions and tradeoffs. Push back if a
   simpler path exists. Propose testable success criteria and confirm them.
2. **Implement (Rules 2 & 3).** Minimum viable change, surgical, matching
   existing style. Flag any security/correctness concern *before* writing
   code — never paper over it.
3. **Verify.** `pnpm build` clean, run the affected flow, check logs/output.
   Root-cause bugs before fixing — no symptom patches.
4. **Pre-commit review.** Run the checklist below against the diff.
5. **After any user correction.** Save a `feedback` memory so the same mistake
   does not recur.

## Pre-Commit Review Checklist

Run against **every changed file** before declaring anything done.

Universal:

- **Crash safety.** No unchecked nulls/indexing in production paths. Fail
  gracefully and surface errors to the UI, never crash.
- **No debug logging.** No stray `console.log` in committed code. Never log
  secrets, PII, tokens, or identifiers.
- **Build cleanly before declaring done.** Write to the strictest bar
  (CI/`pnpm build`, not just the dev server).
- **Secrets stay server-side.** Never hardcode keys; never commit `.env*`;
  stage files explicitly (no `git add -A`). Supabase service-role key and
  Stripe secret key never reach client code.
- **Root-caused, not symptom-patched.** The fix names the actual cause.

Project-specific — grow this list every time something breaks in a way a
generic reviewer wouldn't catch:

- Every new Supabase table ships with RLS policies in the same migration.
- The Stripe test bypass must be gated so it cannot activate in production.
- **No em-dashes in public copy** (hard rule). Rewrite around them: split the
  sentence, or use a comma, colon, or parentheses. En-dashes for ranges
  (Mon–Fri) are fine. Enforce with `grep -rn "—" src/` → must be 0.

## Memory Discipline

One fact per file in the memory directory, indexed by `MEMORY.md` (pointers
only, never content). Types: `user`, `feedback`, `project`, `reference`.

- After any user correction → save a `feedback` memory with the *why*.
- Prefer explicit "save memories" over silent auto-saving.
- Don't save what the repo already records (code structure, git history,
  `AGENTS.md` content). If asked to remember something obvious, ask what was
  non-obvious and save that.
- Update existing memories rather than duplicating; delete wrong ones; don't
  rename slugs (they're referenced by `[[wikilinks]]`).

## Knowledge Records

Human/auditor-facing, version-controlled — distinct from memory. Don't
duplicate a record's body into memory; note its *path* instead.

- **Decisions** (`Docs/decisions/`, `/decision`): numbered ADRs. Never skip
  **The Critical Assumption** and **Early Warning Signs**. Set a Review Date
  ~90 days out; fill in **Outcome** at review.
- **SOPs** (`Docs/sops/`, `/sop`): repeatable procedures. Mandatory sections:
  **Verification** (the confirming artefact) and **Common Failures**.
- Fill templates **only** with what the repo or the human provides. Leave
  unknown fields blank; flag ambiguity with `[UNCLEAR]`.

## Git & Security Hygiene

- Commit and push **only when asked**. Stage files explicitly. Branch before
  committing on `main`.
- No `Co-Authored-By` trailers.
- Never commit secrets or `.env*`. All sensitive keys live server-side.
- Flag any security/compliance concern *before* writing code.

## Workflow Stance

- Single-agent + the checklist is preferred over multi-agent orchestration for
  steady feature work. Parallel agents only for genuine wide fan-outs.
- Never mark a task complete without proving it works: build, run the affected
  flow, check the output.
