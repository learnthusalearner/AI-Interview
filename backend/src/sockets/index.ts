import { Server, Socket } from 'socket.io';
import { logger } from '../config/logger';
import { InterviewService } from '../services/InterviewService';

export const setupSockets = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    logger.info(`New WebSocket Connection: ${socket.id}`);

    socket.on('start_interview', async (data: { candidateName: string }) => {
      try {
        const result = await InterviewService.startInterview(data.candidateName);
        socket.emit('interview_started', result);
      } catch (error: any) {
        logger.error(`Socket start_interview error: ${error.message}`);
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('respond', async (data: { sessionId: string; text: string }) => {
      try {
        const result = await InterviewService.respondToInterview(data.sessionId, data.text);
        socket.emit('assistant_reply', result);
      } catch (error: any) {
        logger.error(`Socket respond error: ${error.message}`);
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('disconnect', () => {
      logger.info(`WebSocket Disconnected: ${socket.id}`);
    });
  });
};
