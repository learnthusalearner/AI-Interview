"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const app_1 = __importDefault(require("./app"));
const env_1 = require("./config/env");
const logger_1 = require("./config/logger");
const prisma_1 = require("./config/prisma");
const sockets_1 = require("./sockets");
const keepAlive_1 = require("./utils/keepAlive");
const server = http_1.default.createServer(app_1.default);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: env_1.env.CORS_ORIGIN,
        methods: ['GET', 'POST'],
    },
});
(0, sockets_1.setupSockets)(io);
const PORT = env_1.env.PORT;
server.listen(PORT, async () => {
    try {
        await prisma_1.prisma.$connect();
        logger_1.logger.info('📦 Connected to PostgreSQL DB via Prisma');
        logger_1.logger.info(`🚀 Server running in ${env_1.env.NODE_ENV} mode on port ${PORT}`);
        (0, keepAlive_1.startKeepAlive)();
    }
    catch (error) {
        logger_1.logger.error('Database connection might be delayed. Prisma will lazily connect on next request.', error.message);
        (0, keepAlive_1.startKeepAlive)();
    }
});
const gracefulShutdown = async (signal) => {
    logger_1.logger.info(`Received signal to terminate: ${signal}`);
    server.close(async () => {
        logger_1.logger.info('HTTP server closed');
        await prisma_1.prisma.$disconnect();
        logger_1.logger.info('Database connection closed');
        process.exit(0);
    });
    setTimeout(() => {
        logger_1.logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 10000);
};
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('unhandledRejection', (err) => {
    logger_1.logger.error(`Unhandled Promise Rejection: ${err.message}`);
    gracefulShutdown('unhandledRejection');
});
