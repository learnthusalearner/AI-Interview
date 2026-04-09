import http from 'http';
import { Server } from 'socket.io';
import app from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { prisma } from './config/prisma';
import { setupSockets } from './sockets';

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: env.CORS_ORIGIN,
    methods: ['GET', 'POST'],
  },
});

setupSockets(io);

const PORT = env.PORT;

server.listen(PORT, async () => {
  try {
    await prisma.$connect();
    logger.info('📦 Connected to PostgreSQL DB via Prisma');
    logger.info(`🚀 Server running in ${env.NODE_ENV} mode on port ${PORT}`);
  } catch (error: any) {
    logger.error('Database connection might be delayed. Prisma will lazily connect on next request.', error.message);
  }
});

const gracefulShutdown = async (signal: string) => {
  logger.info(`Received signal to terminate: ${signal}`);
  
  server.close(async () => {
    logger.info('HTTP server closed');
    await prisma.$disconnect();
    logger.info('Database connection closed');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('unhandledRejection', (err: any) => {
  logger.error(`Unhandled Promise Rejection: ${err.message}`);
  gracefulShutdown('unhandledRejection');
});
