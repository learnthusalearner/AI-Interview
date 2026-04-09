import { Router } from 'express';
import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';

const router = Router();

router.get('/candidates', async (req, res, next) => {
  try {
    const sessions = await prisma.interviewSession.findMany({
      where: { status: 'COMPLETED' },
      orderBy: { totalScore: 'desc' },
      select: {
        id: true,
        candidateName: true,
        candidateEmail: true,
        applicationStatus: true,
        overallRecommendation: true,
        totalScore: true,
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
    const { sessionId, status } = req.body;
    const { InterviewService } = await import('../../services/InterviewService');
    const updatedSession = await InterviewService.updateApplicationStatus(sessionId, status);
    
    return res.status(200).json({ status: 'success', data: updatedSession });
  } catch (error) {
    next(error);
  }
});

export default router;
