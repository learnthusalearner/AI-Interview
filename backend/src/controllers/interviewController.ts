import { Request, Response } from 'express';
import { InterviewService } from '../services/InterviewService';

export class InterviewController {
  static async start(req: Request, res: Response) {
    try {
      const { candidateName, candidateEmail } = req.body;
      const result = await InterviewService.startInterview(candidateName, candidateEmail);
      res.status(201).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async respond(req: Request, res: Response) {
    try {
      const { sessionId, text } = req.body;
      const result = await InterviewService.respondToInterview(sessionId, text);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async evaluate(req: Request, res: Response) {
    try {
      const { sessionId } = req.body;
      const result = await InterviewService.evaluateSession(sessionId);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async submitFeedback(req: Request, res: Response) {
    try {
      const { sessionId, feedback } = req.body;
      const result = await InterviewService.submitFeedback(sessionId, feedback);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getSessionsByEmail(req: Request, res: Response) {
    try {
      const { email } = req.params;
      const result = await InterviewService.getSessionsByEmail(email as string);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

