import { Router } from 'express';
import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { InterviewService } from '../../services/InterviewService';

const router = Router();

router.get('/candidates', async (req, res, next) => {
  try {
    const sessions = await prisma.interviewSession.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        candidateName: true,
        candidateEmail: true,
        status: true,
        applicationStatus: true,
        overallRecommendation: true,
        totalScore: true,
        cheatCount: true,
        evaluationData: true,
        feedback: true,
        createdAt: true,
        messages: {
          where: { role: { not: 'system' } },
          select: { role: true, content: true, clarity: true, warmth: true, simplicity: true, patience: true, fluency: true, createdAt: true },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    return res.status(200).json({ status: 'success', data: sessions });
  } catch (error) {
    next(error);
  }
});

router.post('/status', async (req, res, next) => {
  try {
    const { sessionId, status, feedbackReason } = req.body;
    const updatedSession = await InterviewService.updateApplicationStatus(sessionId, status, feedbackReason);
    
    return res.status(200).json({ status: 'success', data: updatedSession });
  } catch (error) {
    next(error);
  }
});

export default router;
