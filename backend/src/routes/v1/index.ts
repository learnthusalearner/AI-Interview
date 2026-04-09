import { Router } from 'express';
import voiceRoutes from './voiceRoutes';
import interviewRoutes from './interviewRoutes';

import adminRoutes from './adminRoutes';

const router = Router();

router.use('/voice', voiceRoutes);
router.use('/interview', interviewRoutes);
router.use('/admin', adminRoutes);

export default router;
