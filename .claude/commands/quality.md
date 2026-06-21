Run all quality gates for this project in sequence and report the result of each step.

Steps:
1. `pnpm typecheck` — TypeScript type checking (no emit)
2. `pnpm lint` — ESLint with TypeScript rules
3. `pnpm format:check` — Prettier format check

Run each step. If a step fails, show the full error output and stop — do not run subsequent steps. If all steps pass, print a single summary line confirming all gates passed.
