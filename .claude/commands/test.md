Run a full end-to-end smoke test of the RAG pipeline:

1. **Ingest** — run `pnpm dev:ingest ./docs` and confirm it succeeds. Report how many PDFs were loaded and how many chunks were created. If ingestion fails, stop and show the error.

2. **Ask** — run `pnpm dev:ask -- -q "What is this document about?"` against the freshly ingested store. Print the answer verbatim.

3. **Report** — summarise:
   - PASS or FAIL for ingestion
   - PASS or FAIL for the ask (pass = got a non-empty answer, fail = error or empty)
   - The answer returned by the pipeline

Do not modify any source files. This is a read-only smoke test.
