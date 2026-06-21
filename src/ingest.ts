import { readdir } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { FaissStore } from '@langchain/community/vectorstores/faiss';
import type { Document } from '@langchain/core/documents';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { logger } from './logger.js';
import { env } from './env.js';

export class Ingester {
  constructor(private readonly docsPath: string) {}

  /**
   * Ingests PDF documents into a FAISS vector store.
   *
   * Pipeline:
   * 1. Load PDFs
   * 2. Split into chunks
   * 3. Generate embeddings
   * 4. Save vector store
   */
  async run(): Promise<void> {
    logger.info({ docsPath: this.docsPath }, 'Starting ingestion');

    // Step 1: Load raw documents
    const rawDocs = await this.loadPdfs();

    if (rawDocs.length === 0) {
      logger.warn({ docsPath: this.docsPath }, 'No PDF files found');
      return;
    }

    logger.info({ pages: rawDocs.length }, 'Splitting into chunks');

    // Step 2: Split documents into chunks
    const chunks = await this.split(rawDocs);

    logger.info({ chunks: chunks.length }, 'Embedding chunks');

    // Step 3: Create vector store
    const store = await this.embed(chunks);

    // Step 4: Save locally
    await this.save(store);
  }

  /**
   * Loads all PDF files from the configured directory and converts them into LangChain Documents.
   *
   * @returns Array of loaded Document objects
   */
  private async loadPdfs(): Promise<Document[]> {
    // Read all files in directory
    const files = await readdir(this.docsPath);

    const docs: Document[] = [];

    try {
      for (const file of files) {
        // Skip non-PDF files
        if (extname(file).toLowerCase() !== '.pdf') continue;

        const filePath = join(this.docsPath, file);

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
   * Splits documents into overlapping chunks for embedding.
   *
   * @param docs - Raw loaded documents
   * @returns Array of chunked Document objects
   */
  private async split(docs: Document[]): Promise<Document[]> {
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    return splitter.splitDocuments(docs);
  }

  /**
   * Creates a FAISS vector store from document chunks using Gemini embeddings.
   *
   * @param chunks - Chunked documents to embed
   * @returns Populated FaissStore instance
   */
  private async embed(chunks: Document[]): Promise<FaissStore> {
    // Create embeddings model
    const embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: env.geminiApiKey,
      modelName: env.geminiEmbeddingModel,
    });

    return FaissStore.fromDocuments(chunks, embeddings);
  }

  /**
   * Persists the FAISS store to disk at the configured path.
   *
   * @param store - Vector store to save
   */
  private async save(store: FaissStore): Promise<void> {
    await store.save(env.vectorStorePath);

    logger.info(
      { path: env.vectorStorePath },
      'Vector store saved',
    );
  }
}
