import { readdir } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { FaissStore } from '@langchain/community/vectorstores/faiss';
import type { Document } from '@langchain/core/documents';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { logger } from './logger.js';
import { env } from './env.js';

/**
 * Loads all PDF files from a directory and converts them into LangChain Documents.
 *
 * @param docsPath - Directory containing PDF files
 * @returns Array of loaded Document objects
 */
async function loadPdfs(docsPath: string): Promise<Document[]> {
  // Read all files in directory
  const files = await readdir(docsPath);

  const docs: Document[] = [];

  try {
    for (const file of files) {
      // Skip non-PDF files
      if (extname(file).toLowerCase() !== '.pdf') continue;

      const filePath = join(docsPath, file);

      // Log file processing
      logger.info({ file }, 'loading PDF');

      // Load PDF into LangChain documents
      const loader = new PDFLoader(filePath);
      const loadedDocs = await loader.load();

      // Collect documents
      docs.push(...loadedDocs);
    }

    return docs;
  } catch (err) {
    // Log and propagate error
    logger.error({ err }, 'Failed to load PDFs');
    throw err;
  }
}

/**
 * Ingests PDF documents into a FAISS vector store.
 *
 * Pipeline:
 * 1. Load PDFs
 * 2. Split into chunks
 * 3. Generate embeddings
 * 4. Save vector store
 *
 * @param docsPath - Path containing PDF files
 */
export async function ingest(docsPath: string): Promise<void> {
  logger.info({ docsPath }, 'Starting ingestion');

  // Step 1: Load raw documents
  const rawDocs = await loadPdfs(docsPath);

  if (rawDocs.length === 0) {
    logger.warn({ docsPath }, 'No PDF files found');
    return;
  }

  logger.info({ pages: rawDocs.length }, 'Splitting into chunks');

  // Step 2: Split documents into chunks
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  const chunks = await splitter.splitDocuments(rawDocs);

  logger.info({ chunks: chunks.length }, 'Embedding chunks');

  // Step 3: Create embeddings model
  const embeddings = new GoogleGenerativeAIEmbeddings({
    apiKey: env.geminiApiKey,
    modelName: env.geminiEmbeddingModel,
  });

  // Step 4: Create vector store
  const store = await FaissStore.fromDocuments(chunks, embeddings);

  // Step 5: Save locally
  await store.save(env.vectorStorePath);

  logger.info(
    { path: env.vectorStorePath, chunks: chunks.length },
    'Vector store saved',
  );
}
