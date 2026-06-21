import { FaissStore } from '@langchain/community/vectorstores/faiss';
import {
  GoogleGenerativeAIEmbeddings,
  ChatGoogleGenerativeAI,
} from '@langchain/google-genai';
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from '@langchain/core/prompts';
import {
  RunnableSequence,
  RunnablePassthrough,
} from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import {
  HumanMessage,
  AIMessage,
  type BaseMessage,
} from '@langchain/core/messages';
import { env } from './env.js';
import { logger } from './logger.js';

export interface ChatTurn {
  role: 'human' | 'ai';
  content: string;
}

export class RAGPipeline {
  /**
   * Ask a question using RAG pipeline:
   * 1. Condense follow-up question (if history exists)
   * 2. Retrieve relevant documents
   * 3. Generate answer using LLM + context
   *
   * @param question - User question
   * @param history - Chat history (optional)
   * @returns Final LLM answer
   */
  async ask(question: string, history: ChatTurn[] = []): Promise<string> {
    // Convert chat history to LangChain messages
    const chatHistory: BaseMessage[] = history.map((m) =>
      m.role === 'human' ? new HumanMessage(m.content) : new AIMessage(m.content),
    );

    // Convert question if history exists
    const standalone = await this.condenseQuestion(question, chatHistory);

    logger.debug({ standalone }, 'Standalone question');

    return this.retrieveAndAnswer(standalone, chatHistory);
  }

  /**
   * Loads FAISS vector store from disk using Gemini embeddings.
   *
   * @returns Loaded FaissStore instance
   */
  private async loadStore(): Promise<FaissStore> {
    const embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: env.geminiApiKey,
      modelName: env.geminiEmbeddingModel,
    });

    return FaissStore.load(env.vectorStorePath, embeddings);
  }

  /**
   * Rewrites a follow-up question as a standalone question using chat history.
   * Returns the original question unchanged if there is no history.
   *
   * @param question - Raw user question
   * @param chatHistory - Accumulated conversation messages
   * @returns Standalone question string
   */
  private async condenseQuestion(
    question: string,
    chatHistory: BaseMessage[],
  ): Promise<string> {
    if (chatHistory.length === 0) return question;

    const llm = new ChatGoogleGenerativeAI({
      model: env.geminiModel,
      apiKey: env.geminiApiKey,
      temperature: 0.2,
    });

    // Chain: convert follow-up question → standalone question
    const condenseChain = RunnableSequence.from([
      ChatPromptTemplate.fromMessages([
        [
          'system',
          'Rewrite the follow-up question as a standalone question. Output ONLY the question.',
        ],
        new MessagesPlaceholder('chat_history'),
        ['human', '{question}'],
      ]),
      llm,
      new StringOutputParser(),
    ]);

    return condenseChain.invoke({ question, chat_history: chatHistory });
  }

  /**
   * Retrieves relevant document chunks and generates a grounded answer.
   *
   * @param standalone - Condensed standalone question
   * @param chatHistory - Accumulated conversation messages
   * @returns LLM-generated answer string
   */
  private async retrieveAndAnswer(
    standalone: string,
    chatHistory: BaseMessage[],
  ): Promise<string> {
    const store = await this.loadStore();
    const retriever = store.asRetriever({ k: 5 });

    const llm = new ChatGoogleGenerativeAI({
      model: env.geminiModel,
      apiKey: env.geminiApiKey,
      temperature: 0.2,
    });

    // Retrieve relevant documents
    const docs = await retriever.invoke(standalone);
    logger.debug({ chunks: docs.length }, 'Retrieved chunks');

    // RAG answer chain
    const answerChain = RunnableSequence.from([
      // Inject retrieved context
      RunnablePassthrough.assign({
        context: () => docs.map((d) => d.pageContent).join('\n\n'),
      }),

      // Prompt template
      ChatPromptTemplate.fromMessages([
        [
          'system',
          `You are a helpful assistant. Answer ONLY using the context below.
If context is insufficient, say so.

Context:
{context}`,
        ],
        new MessagesPlaceholder('chat_history'),
        ['human', '{question}'],
      ]),

      llm,
      new StringOutputParser(),
    ]);

    // Generate final answer
    return answerChain.invoke({
      question: standalone,
      chat_history: chatHistory,
    });
  }
}
