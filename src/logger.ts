import pino from 'pino';
import { env } from './env.js';

// Check if running in development mode
const isDev = env.nodeEnv !== 'production';

export const logger = pino({
  // Log level from env config
  level: env.logLevel,

  // Pretty logs only in development
  ...(isDev && {
    transport: {
      target: 'pino-pretty',
      options: {
        // colored output
        colorize: true,
        // readable time
        translateTime: 'SYS:HH:MM:ss',
        // remove noise
        ignore: 'pid,hostname',
      },
    },
  }),
});
