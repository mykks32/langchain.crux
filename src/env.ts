function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

export const env = {
  nodeEnv: process.env['NODE_ENV'] ?? 'development',
  logLevel: process.env['LOG_LEVEL'] ?? 'info',
  geminiApiKey: requireEnv('GEMINI_API_KEY'),
  geminiModel: process.env['GEMINI_MODEL'] ?? 'gemini-2.0-flash',
  geminiEmbeddingModel:
    process.env['GEMINI_EMBEDDING_MODEL'] ?? 'gemini-embedding-001',
  vectorStorePath: process.env['VECTOR_STORE_PATH'] ?? './.vectorstore',
} as const;
