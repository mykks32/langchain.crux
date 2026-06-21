Run PDF ingestion against the provided path.

Usage: /ingest <path>   (defaults to ./docs if no path given)

Command: `pnpm dev:ingest $ARGUMENTS` — if no argument provided, use `./docs`.

Show the logger output as-is. After it completes, report:
- How many PDF files were loaded
- How many chunks were created
- Where the vector store was saved
