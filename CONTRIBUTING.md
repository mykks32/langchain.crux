# Contributing

## Class Design

All pipeline logic lives in classes — never standalone exported functions.

```ts
// correct
export class MyPipeline {
  async run(): Promise<void> { ... }
  private async step(): Promise<void> { ... }
}

// wrong
export async function run(): Promise<void> { ... }
```

Instantiate classes at the call site in `index.ts`. Private methods receive inputs as parameters and return values — no shared mutable state.

## Comments and JSDoc

Every public method gets a JSDoc block. Every non-obvious inline step gets a `//` comment.

```ts
/**
 * Short description of what this method does.
 *
 * @param foo - what foo represents
 * @returns what the return value means
 */
async myMethod(foo: string): Promise<string> {
  // Why this step exists if non-obvious
  const result = await doSomething(foo);
  return result;
}
```

When refactoring, **always carry comments over to the new location**. Update the wording if the logic changes; never delete.

## Code Style

- Single quotes, trailing commas — enforced by Prettier (`.prettierrc`)
- TypeScript strict mode — no `any` unless unavoidable
- ESLint with `typescript-eslint` recommended + type-checked rules

Run before committing:

```bash
pnpm typecheck
pnpm lint
pnpm format:check
```

## Environment Files

| File | Purpose |
|---|---|
| `.env.example` | Template — commit this, no real values |
| `.env.dev` | Local dev secrets — git-ignored |
| `.env.prod` | Production secrets — git-ignored, managed outside repo |

Never commit real API keys. `.env.*` is in `.gitignore`.

## Commit Style

Use conventional commits:

```
feat(rag): add streaming support
fix(ingest): handle empty PDF pages
refactor(ingest): extract split step into private method
docs: update CONTRIBUTING.md
```

Scope matches the source file name (`rag`, `ingest`, `env`, `logger`, `cli`).
