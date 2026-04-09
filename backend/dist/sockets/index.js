"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSockets = void 0;
const logger_1 = require("../config/logger");
const InterviewService_1 = require("../services/InterviewService");
const setupSockets = (io) => {
    io.on('connection', (socket) => {
        logger_1.logger.info(`New WebSocket Connection: ${socket.id}`);
        socket.on('start_interview', async (data) => {
            try {
                const result = await InterviewService_1.InterviewService.startInterview(data.candidateName);
                socket.emit('interview_started', result);
            }
            catch (error) {
                logger_1.logger.error(`Socket start_interview error: ${error.message}`);
                socket.emit('error', { message: error.message });
            }
        });
        socket.on('respond', async (data) => {
            try {
                const result = await InterviewService_1.InterviewService.respondToInterview(data.sessionId, data.text);
                socket.emit('assistant_reply', result);
            }
            catch (error) {
                logger_1.logger.error(`Socket respond error: ${error.message}`);
                socket.emit('error', { message: error.message });
            }
        });
        socket.on('disconnect', () => {
            logger_1.logger.info(`WebSocket Disconnected: ${socket.id}`);
        });
    });
};
exports.setupSockets = setupSockets;
