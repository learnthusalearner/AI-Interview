"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIService = void 0;
const openai_1 = __importDefault(require("openai"));
const fs_1 = __importDefault(require("fs"));
const env_1 = require("../config/env");
const logger_1 = require("../config/logger");
const openai = new openai_1.default({
    apiKey: env_1.env.OPENAI_API_KEY,
});
class OpenAIService {
    /**
     * Translates an audio file using Whisper STT
     */
    static async transcribeAudio(filePath) {
        try {
            const response = await openai.audio.transcriptions.create({
                file: fs_1.default.createReadStream(filePath),
                model: 'whisper-1',
                response_format: 'text',
            });
            return response; // text format returns a plain string
        }
        catch (error) {
            logger_1.logger.error(`OpenAI Transcription Error: ${error}`);
            throw new Error('Failed to transcribe audio.');
        }
    }
    /**
     * Chat completion handler
     */
    static async getChatCompletion(messages, systemPrompt) {
        const apiMessages = systemPrompt
            ? [{ role: 'system', content: systemPrompt }, ...messages]
            : messages;
        try {
            const response = await openai.chat.completions.create({
                model: 'gpt-4',
                messages: apiMessages,
                temperature: 0.7,
            });
            return response.choices[0].message.content || '';
        }
        catch (error) {
            logger_1.logger.error(`OpenAI Chat Error: ${error}`);
            throw new Error('Failed to get chat completion.');
        }
    }
    /**
     * JSON Structure Evaluator
     */
    static async evaluateInterview(messages) {
        const evaluationPrompt = `
      You are an expert AI evaluator. Review the following interview transcript.
      Provide a structured JSON output evaluating the candidate on:
      - clarity (1-10, plus reasoning)
      - warmth (1-10, plus reasoning)
      - patience (1-10, plus reasoning)
      - simplicity (1-10, plus reasoning)
      - fluency (1-10, plus reasoning)
      - overallRecommendation ("PASS" or "FAIL")
      - evidenceQuotes (array of strings)

      Respond raw JSON ONLY.
    `;
        try {
            const response = await openai.chat.completions.create({
                model: 'gpt-4',
                messages: [
                    { role: 'system', content: evaluationPrompt },
                    ...messages
                ],
                temperature: 0.2, // low temperature for consistent JSON
            });
            const content = response.choices[0].message.content || '{}';
            // Sometimes it wraps in ```json ... ```, so clean it safely
            const cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleanContent);
        }
        catch (error) {
            logger_1.logger.error(`OpenAI Eval Error: ${error}`);
            throw new Error('Failed to evaluate interview.');
        }
    }
}
exports.OpenAIService = OpenAIService;
