import OpenAI from 'openai';
import fs from 'fs';
import { env } from '../config/env';
import { logger } from '../config/logger';

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

export class OpenAIService {
  /**
   * Translates an audio file using Whisper STT
   */
  static async transcribeAudio(filePath: string): Promise<string> {
    try {
      const response = await openai.audio.translations.create({
        file: fs.createReadStream(filePath),
        model: 'whisper-1',
        response_format: 'text',
      });
      return response as unknown as string; // text format returns a plain string
    } catch (error) {
      logger.error(`OpenAI Transcription Error: ${error}`);
      throw new Error('Failed to transcribe audio.');
    }
  }

  /**
   * Chat completion handler
   */
  static async getChatCompletion(messages: any[], systemPrompt?: string): Promise<string> {
    const apiMessages = systemPrompt 
      ? [{ role: 'system', content: systemPrompt }, ...messages]
      : messages;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: apiMessages,
        temperature: 0.7,
      });
      return response.choices[0].message.content || '';
    } catch (error) {
      logger.error(`OpenAI Chat Error: ${error}`);
      throw new Error('Failed to get chat completion.');
    }
  }

  /**
   * Quick Micro-Evaluation of a Single Answer for Adaptive Cutoff
   */
  static async evaluateSingleAnswer(questionText: string, userText: string): Promise<any> {
    const prompt = `
      You are a strict but fair tutor evaluator. Score the candidate's single response (1-10) against the question asked.

      Question: "${questionText}"
      Candidate Answer: "${userText}"

      Rubric (1=Poor, 10=Excellent):
      - clarity: logical, well-structured, easy to follow.
      - warmth: supportive, encouraging, empathetic tone.
      - simplicity: child-appropriate language without jargon.
      - patience: how well the answer shows support for a struggling student.
      - fluency: natural, coherent English with good sentence flow.

      Score fairly based only on this answer. Do not add extra commentary.
      Return ONLY a raw JSON object matching this exact schema (no markdown, no extra text):
      {
        "clarity": 8,
        "warmth": 9,
        "simplicity": 7,
        "patience": 8,
        "fluency": 9,
        "average": 8.2
      }
    `;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: prompt }],
        temperature: 0.1,
      });

      const content = response.choices[0].message.content || '{}';
      const cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanContent);
    } catch (error) {
      logger.error(`Single Answer Eval Error: ${error}`);
      // Fallback safe scores so interview doesn't crash on one bad JSON
      return { clarity: 5, warmth: 5, simplicity: 5, patience: 5, fluency: 5, average: 5.0 };
    }
  }

  /**
   * JSON Structure Evaluator (Final Output)
   */
  static async evaluateInterview(messages: any[]): Promise<any> {
    const evaluationPrompt = `
      You are an expert AI evaluator for Cuemath tutor interviews. Review the following transcript.
      
      --------------------------------------------------
      📊 EVALUATION
      --------------------------------------------------
      Provide a structured JSON output evaluating the candidate strictly on:
      - clarity (1-10 string score representing 1-5 logically scaled x2)
      - warmth (1-10)
      - patience (1-10)
      - simplicity (1-10)
      - fluency (1-10)
      - overallRecommendation ("PASS" or "FAIL")
      - evidenceQuotes (array of strings)

      --------------------------------------------------
      📏 SCORING GUIDELINES
      --------------------------------------------------
      10 = Excellent (clear, child-friendly, empathetic, fluent)
      8 = Good (minor issues)
      6 = Average (some clarity but inconsistent)
      4 = Weak (struggles to communicate)
      1-2 = Poor (not suitable for tutoring)

      IMPORTANT:
      - Use actual quotes from candidate responses in \`evidenceQuotes\`
      - Be fair, not overly harsh
      - Do NOT hallucinate evidence

      Return ONLY valid JSON in exactly this root-level schema shape (do NOT nest score/reasoning inside sub-objects, output exactly this):
      {
        "clarity": { "score": 8, "reasoning": "..." },
        "simplicity": { "score": 7, "reasoning": "..." },
        "patience": { "score": 9, "reasoning": "..." },
        "warmth": { "score": 10, "reasoning": "..." },
        "fluency": { "score": 8, "reasoning": "..." },
        "overallRecommendation": "PASS",
        "evidenceQuotes": ["Quote 1 here", "Quote 2 here"]
      }
    `;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
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
    } catch (error) {
      logger.error(`OpenAI Eval Error: ${error}`);
      // Fallback safe evaluation instead of crashing the server via unhandled rejection
      return {
        clarity: { score: 5, reasoning: "Evaluation generation failed." },
        simplicity: { score: 5, reasoning: "Evaluation generation failed." },
        patience: { score: 5, reasoning: "Evaluation generation failed." },
        warmth: { score: 5, reasoning: "Evaluation generation failed." },
        fluency: { score: 5, reasoning: "Evaluation generation failed." },
        overallRecommendation: "FAIL",
        evidenceQuotes: []
      };
    }
  }
}
