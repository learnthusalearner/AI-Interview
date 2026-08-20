import { Server, Socket } from 'socket.io';
import { logger } from '../config/logger';
import { InterviewService } from '../services/InterviewService';
import { inferenceService } from '../ml/services/inferenceService';
import { ObjectTrackerService } from '../ml/services/ObjectTrackerService';
import { prisma } from '../config/prisma';

export const setupSockets = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    logger.info(`🔌 WebSocket Client Connected: ${socket.id}`);

    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    // Real-Time ML Frame Inference over WebSocket
    socket.on('ml_frame', async (imageInput: any, options?: { runFace?: boolean; runObject?: boolean; metadata?: any }) => {
      try {
        let input: string | Buffer;
        if (Buffer.isBuffer(imageInput)) {
          input = imageInput;
        } else if (imageInput && typeof imageInput === 'object' && imageInput.image) {
          input = imageInput.image;
        } else if (typeof imageInput === 'string') {
          input = imageInput;
        } else {
          socket.emit('ml_error', { message: 'Invalid or missing image payload' });
          return;
        }

        const runFace = options?.runFace !== false;
        const runObject = options?.runObject === true;

        const result = await inferenceService.runDetection(input, { runFace, runObject });
        
        let currentCheatCount = 0;
        if (result.success) {
          const sessionId = options?.metadata?.sessionId || `temp-${socket.id}`;
          const tracker = ObjectTrackerService.getTracker(sessionId);
          const tracks = await tracker.processFrameDetections(result.objects);
          
          result.objects = tracks.map(t => ({
            class: t.class,
            confidence: t.confidence,
            x: t.bbox.x,
            y: t.bbox.y,
            width: t.bbox.width,
            height: t.bbox.height,
            trackId: t.trackId,
            risk: t.risk,
            state: t.state
          }));

          if (sessionId && !sessionId.startsWith("temp-")) {
            const dbSession = await prisma.interviewSession.findUnique({
              where: { id: sessionId },
              select: { cheatCount: true }
            });
            currentCheatCount = dbSession?.cheatCount || 0;
          }
        }

        socket.emit('ml_result', {
          ...result,
          cheatCount: currentCheatCount,
          metadata: options?.metadata || {}
        });
      } catch (error: any) {
        logger.error(`[Socket ML] Detection error: ${error.message}`);
        socket.emit('ml_error', { message: error.message });
      }
    });

    socket.on('trigger_violation', async (data: { sessionId: string; type: string; message: string; points?: number }) => {
      try {
        const { sessionId, type, message } = data;
        if (!sessionId || sessionId.startsWith("temp-")) return;

        logger.info(`[FLAG] session=${sessionId} type=${type} message=${message}`);

        // 1. Map type to event category
        let eventType = "SUSPICIOUS_OBJECT";
        if (type === 'ABSENT_USER') eventType = "FACE_ABSENCE";
        else if (type === 'MULTIPLE_FACES') eventType = "MULTIPLE_FACES";
        else if (type === 'MOBILE_PHONE' || type === 'UNAUTHORIZED_DEVICE') eventType = "UNAUTHORIZED_DEVICE";

        // Weighted Misconduct Points: +2 for phone/device, +1 for face absence
        const points = data.points || (eventType === 'UNAUTHORIZED_DEVICE' || type === 'MOBILE_PHONE' ? 2 : 1);

        // 2. Save structured event to DB
        await prisma.detectionEvent.create({
          data: {
            interviewSessionId: sessionId,
            eventType,
            objectClass: type === 'ABSENT_USER' ? 'face' : undefined,
            confidence: 1.0,
            riskLevel: 'HIGH'
          }
        });

        // 3. Atomically increment session flag count by misconduct points
        const updatedSession = await prisma.interviewSession.update({
          where: { id: sessionId },
          data: {
            cheatCount: {
              increment: points
            }
          }
        });

        io.to(socket.id).emit('violation_count_update', { cheatCount: updatedSession.cheatCount });
      } catch (err: any) {
        logger.error(`Failed to handle trigger_violation socket event: ${err.message}`);
      }
    });

    socket.on('start_interview', async (data: { candidateName: string }) => {
      try {
        const result = await InterviewService.startInterview(data.candidateName);
        socket.data = socket.data || {};
        socket.data.sessionId = result.sessionId;
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

    socket.on('disconnect', (reason) => {
      logger.info(`🔌 WebSocket Client Disconnected: ${socket.id} (Reason: ${reason})`);
      ObjectTrackerService.removeTracker(`temp-${socket.id}`);
      if (socket.data?.sessionId) {
        ObjectTrackerService.removeTracker(socket.data.sessionId);
      }
    });
  });
};
