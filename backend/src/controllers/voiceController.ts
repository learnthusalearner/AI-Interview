import { Request, Response } from 'express';
import { OpenAIService } from '../services/OpenAIService';
import { AppError } from '../utils/AppError';
import fs from 'fs';

export class VoiceController {
  static async processInput(req: Request, res: Response) {
    if (!req.file) {
      throw new AppError('No audio file provided', 400);
    }

    try {
      const transcript = await OpenAIService.transcribeAudio(req.file.path);

      // Clean up the temp file after processing
      fs.unlink(req.file.path, (err) => {
        if (err) console.error(`Failed to delete temp file: ${err.message}`);
      });

      res.status(200).json({ success: true, data: { transcript } });
    } catch (error) {
      // Clean up file if error
      fs.unlink(req.file.path, () => {});
      throw error;
    }
  }
}
