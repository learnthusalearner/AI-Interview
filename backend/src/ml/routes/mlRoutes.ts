import { Router, Request, Response } from 'express';
import { inferenceService } from '../services/inferenceService';

const router = Router();

/**
 * GET /api/ml/health
 * Returns status of loaded ML models
 */
router.get('/health', (req: Request, res: Response) => {
  const health = inferenceService.getHealth();
  res.status(200).json(health);
});

/**
 * POST /api/ml/detect
 * Runs real-time Face Detection and COCO-SSD Object Detection on the provided frame
 */
router.post('/detect', async (req: Request, res: Response) => {
  const image = req.body.image || req.body.frame;

  if (!image || typeof image !== 'string') {
    res.status(400).json({
      success: false,
      timestamp: Date.now(),
      processingTimeMs: 0,
      faces: [],
      objects: [],
      error: 'Missing or invalid base64 image field in request body',
    });
    return;
  }

  const result = await inferenceService.runDetection(image);
  res.status(result.success ? 200 : 500).json(result);
});

export default router;
