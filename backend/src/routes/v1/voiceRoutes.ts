import { Router } from 'express';
import { VoiceController } from '../../controllers/voiceController';
import { audioUploadHandler } from '../../middlewares/multerConfig';

const router = Router();

router.post('/input', audioUploadHandler.single('audio'), VoiceController.processInput);

export default router;
