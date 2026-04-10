import { Router } from 'express';
import { InterviewController } from '../../controllers/interviewController';
import { validate } from '../../middlewares/validateRequest';
import { 
  startInterviewSchema, 
  respondInterviewSchema, 
  evaluateInterviewSchema,
  submitFeedbackSchema,
  proctorFrameSchema
} from '../../validations/interviewValidation';

const router = Router();

router.post('/start', validate(startInterviewSchema), InterviewController.start);
router.post('/respond', validate(respondInterviewSchema), InterviewController.respond);
router.post('/evaluate', validate(evaluateInterviewSchema), InterviewController.evaluate);
router.post('/feedback', validate(submitFeedbackSchema), InterviewController.submitFeedback);
router.post('/proctor/frame', validate(proctorFrameSchema), InterviewController.proctorFrame);
router.get('/candidate/sessions/:email', InterviewController.getSessionsByEmail);

export default router;
