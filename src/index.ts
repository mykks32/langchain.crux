/**
 * @file index.ts
 * @description CLI entry point using Commander.
 *
 * Exposes two commands:
 * - `ingest <path>` — indexes PDFs into the vector store
 * - `ask [options]`  — interactive chat or single-question mode
 *
 * Usage:
 *   pnpm dev:ingest ./docs
 *   pnpm dev:ask
 *   pnpm dev:ask -- -q "What is the return policy?"
 */

import { Command } from 'commander';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { Ingester } from './ingest.js';
import { RAGPipeline, type ChatTurn } from './rag.js';
import { logger } from './logger.js';

const program = new Command();

program
  .name('rag')
  .description('Ask questions about your PDF documents')
  .version('1.0.0');

// ingest command

program
  .command('ingest')
  .description('Ingest PDF files into the vector store')
  .argument('<path>', 'Path to folder containing PDF files')
  .action(async (docsPath: string) => {
    try {
      await new Ingester(docsPath).run();
    } catch (err) {
      logger.error({ err }, 'Ingestion failed');
      process.exit(1);
    }
  });

// ask
program
  .command('ask')
  .description('Ask a question about ingested documents (interactive chat)')
  .option(
    '-q, --question <question>',
    'Ask a single question and exit (non-interactive)',
  )
  .action(async (opts: { question?: string }) => {
    // Single-question mode
    // Useful for scripting: pipe the answer into other tools or log it.
    // Logger stays active since readline isn't involved.
    if (opts.question) {
      try {
        const answer = await new RAGPipeline().ask(opts.question);
        process.stdout.write(`\n${answer}\n\n`);
      } catch (err) {
        logger.error({ err }, 'Failed to answer question');
        process.exit(1);
      }
      return;
    }

    // Interactive chat mode
    // Silence pino-pretty here — it writes escape codes to stdout which
    // corrupt the readline prompt and swallow the assistant's response.
    logger.level = 'silent';

    const rl = readline.createInterface({ input, output });

    /** Accumulated conversation turns passed to the RAG chain on each question */
    const history: ChatTurn[] = [];

    process.stdout.write('\n🔍 RAG Chat — ask questions about your PDFs\n');
    process.stdout.write(
      '   Type "exit" to quit, "clear" to reset history\n\n',
    );

    while (true) {
      const question = await rl.question('You: ');
      const trimmed = question.trim();

      // Exit the loop
      if (trimmed.toLowerCase() === 'exit') {
        process.stdout.write('Bye!\n');
        rl.close();
        break;
      }

      // Reset conversation history without restarting the process
      if (trimmed.toLowerCase() === 'clear') {
        history.length = 0;
        process.stdout.write('Chat history cleared.\n\n');
        continue;
      }

      // Ignore accidental empty submits
      if (!trimmed) continue;

      try {
        // Show a "Thinking..." placeholder while waiting for the LLM response.
        // \r moves the cursor back to the start of the line so the answer
        // overwrites it cleanly.
        process.stdout.write('Thinking...\r');
        const answer = await new RAGPipeline().ask(trimmed, history);
        process.stdout.write(`\rAssistant: ${answer}\n\n`);

        // Append this turn to history so follow-up questions have context
        history.push({ role: 'human', content: trimmed });
        history.push({ role: 'ai', content: answer });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        process.stdout.write(`\rError: ${message}\n\n`);
      }
    }
  });

program.parse();
