Ask a single question against the ingested vector store and print the answer.

Usage: /ask <question>

Command: `pnpm dev:ask -- -q "$ARGUMENTS"`

Print the raw answer from the RAG pipeline. If the vector store has not been ingested yet, say so and suggest running /ingest first.
