# CLAUDE.md

## Project Overview

TypeScript CLI for PDF-based RAG (Retrieval-Augmented Generation) using LangChain, FAISS, and Google Gemini. Ingests PDFs into a local FAISS vector store and answers questions against them via an interactive or single-shot CLI.

> Coding conventions and class design patterns are documented in [CONTRIBUTING.md](./CONTRIBUTING.md).

---

## Agent Skills (Slash Commands)

Custom commands are defined in `.claude/commands/`. Type these in the Claude Code prompt:

| Command | Description |
|---|---|
| `/quality` | Run typecheck → lint → format:check in sequence |
| `/build` | Clean dist/ and compile TypeScript |
| `/ingest <path>` | Index PDFs from a path (default: `./docs`) |
| `/ask <question>` | Ask a single question against the vector store |
| `/test` | End-to-end smoke test: ingest `./docs` then ask a question, report PASS/FAIL |

**Hooks (automatic):**
- After every file edit/write → Prettier auto-formats `.ts`, `.json`, `.md` files
- After every response → reminder to run `/quality` before committing

---

## Prerequisites

- Node.js `22.13.0` (see `.nvmrc` — use `nvm use` to switch)
- pnpm `11.8.0` (managed via `packageManager` field)
- A Google Gemini API key

---

## Setup

```bash
cp .env.example .env.dev     # fill in GEMINI_API_KEY
nvm use                       # switch to Node 22.13.0
pnpm install
```

---

## Commands

### Development (tsx, no build needed)

```bash
pnpm dev:ingest ./docs        # Index PDFs into vector store
pnpm dev:ask                  # Interactive chat mode
pnpm dev:ask -- -q "..."      # Single-question mode
```

`dev:ingest` and `dev:ask` load `.env.dev` automatically.

### Build & Run (production)

```bash
pnpm build                    # type-check + compile to dist/
pnpm start:dev ingest ./docs  # run compiled binary with .env.dev
pnpm start:prod ask -q "..."  # run compiled binary with .env.prod
```

### Quality Gates

```bash
pnpm typecheck                # tsc --noEmit (no emit, just type errors)
pnpm lint                     # ESLint with TypeScript rules
pnpm lint:fix                 # auto-fix lint issues
pnpm format                   # Prettier write
pnpm format:check             # Prettier check (CI)
pnpm clean                    # remove dist/
```

---

## Architecture

```
src/
├── index.ts     # CLI entry point (Commander) — wires ingest + ask commands
├── ingest.ts    # Ingester class: PDF → chunks → embeddings → FAISS store
├── rag.ts       # RAGPipeline class: load store → condense → retrieve → answer
├── env.ts       # Validated env config (singleton, throws on missing required vars)
└── logger.ts    # Pino logger (pretty in dev, JSON in prod)
```

### `Ingester` (`ingest.ts`)

```ts
const ingester = new Ingester(docsPath);
await ingester.run();
```

| Method | Visibility | Description |
|---|---|---|
| `run()` | public | Orchestrates the full pipeline |
| `loadPdfs()` | private | Scans dir, loads PDFs into Documents |
| `split(docs)` | private | Chunks documents (1000 chars / 200 overlap) |
| `embed(chunks)` | private | Creates FAISS store via Gemini embeddings |
| `save(store)` | private | Persists store to `VECTOR_STORE_PATH` |

### `RAGPipeline` (`rag.ts`)

```ts
const pipeline = new RAGPipeline();
const answer = await pipeline.ask(question, history);
```

| Method | Visibility | Description |
|---|---|---|
| `ask(question, history?)` | public | Entry point — coordinates the full RAG flow |
| `loadStore()` | private | Loads FAISS store from disk |
| `condenseQuestion(q, history)` | private | Rewrites follow-up as standalone question |
| `retrieveAndAnswer(q, history)` | private | Retrieves top-5 chunks, generates answer |

---

## Environment Variables

| Variable | Default | Required | Description |
|---|---|---|---|
| `GEMINI_API_KEY` | — | ✅ | Google Gemini API key |
| `GEMINI_MODEL` | `gemini-2.0-flash` | | LLM model name |
| `GEMINI_EMBEDDING_MODEL` | `gemini-embedding-001` | | Embedding model name |
| `VECTOR_STORE_PATH` | `./.vectorstore` | | FAISS store location on disk |
| `NODE_ENV` | `development` | | Controls log transport (pretty vs JSON) |
| `LOG_LEVEL` | `info` | | Pino log level |

`env.ts` validates all required vars at startup and throws immediately if any are missing.

---

## Stack

| Layer | Library |
|---|---|
| Runtime | Node.js + TypeScript (`tsx` dev, `tsc` build) |
| LLM + Embeddings | Google Gemini via `@langchain/google-genai` |
| Vector Store | FAISS via `@langchain/community` |
| PDF Loading | `PDFLoader` from `@langchain/community` |
| Text Splitting | `RecursiveCharacterTextSplitter` from `@langchain/textsplitters` |
| CLI | `commander` |
| Logging | `pino` + `pino-pretty` (dev only) |

---

## Dev Notes

- **Logger silenced in interactive mode** — `logger.level = 'silent'` is set before opening the readline interface. pino-pretty escape codes corrupt the prompt and swallow the assistant's response if left active.
- **Fail-fast env validation** — `env.ts` throws at import time for any missing required vars. There is no lazy or deferred validation.
- **Vector store is overwritten on re-ingest** — `store.save()` replaces whatever is at `VECTOR_STORE_PATH`. There is no incremental update.
- **Chat history is in-memory only** — cleared on `clear` command or process exit. No persistence.
- **Always preserve JSDoc and inline comments** — when refactoring, carry all `/** */` and `//` comments to the new location; update wording only if the logic changes.
