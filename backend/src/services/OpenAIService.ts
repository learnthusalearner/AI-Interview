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
      - engagement: how well they keep the listener hooked (voice dynamics via text proxy).

      Also determine the responseQuality. Valid options are: "clear", "vague", "complex", "off-topic", or "unsatisfactory".
      CRITICAL RULE: If the user provides an answer that is completely different from what was asked, ignores the scenario entirely, or is structurally unsatisfactory, label it strictly as "unsatisfactory" or "off-topic". 
      If the response is extremely short (one-word) or silent, label it "vague" or "off-topic" accordingly.

      Score fairly based only on this answer. Do not add extra commentary.
      Return ONLY a raw JSON object matching this exact schema (no markdown, no extra text):
      {
        "clarity": 8,
        "warmth": 9,
        "simplicity": 7,
        "patience": 8,
        "fluency": 9,
        "engagement": 8,
        "average": 8.1,
        "responseQuality": "clear"
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
      return { clarity: 5, warmth: 5, simplicity: 5, patience: 5, fluency: 5, engagement: 5, average: 5.0, responseQuality: "clear" };
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
      - clarity (1-10 scale rating, plus detailed reasoning)
      - warmth (1-10)
      - patience (1-10)
      - simplicity (1-10)
      - fluency (1-10)
      - engagement (1-10 scale rating based on pacing and hooks)
      
      Additionally, include robust metadata:
      - overallRecommendation ("PASS" or "FAIL")
      - evidenceQuotes (array of at least 3 verbatim strings from the candidate)
      - teachingStyle (string: 'example-driven', 'structured', 'unclear', 'authoritative', etc)
      - riskFlags (array of strings, e.g., ["impatience", "vague", "jargon-heavy", "negative tone"])
      - keyHighlights (array of strings praising specific good things they did)
      - consistencyAnalysis (string summarizing if they improved or contradicted themselves)
      - communicationStyleAnalysis (object with fields: structure (string), examplesUsed (boolean), stepByStep (boolean))

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
      - Identify subtle "risk flags" like long monologues or skipping steps
      - Be fair, not overly harsh

      Return ONLY valid JSON in exactly this root-level schema shape (do NOT nest score/reasoning inside sub-objects arbitrarily, output exactly this):
      {
        "clarity": { "score": 8, "reasoning": "..." },
        "simplicity": { "score": 7, "reasoning": "..." },
        "patience": { "score": 9, "reasoning": "..." },
        "warmth": { "score": 10, "reasoning": "..." },
        "fluency": { "score": 8, "reasoning": "..." },
        "engagement": { "score": 8, "reasoning": "..." },
        "overallRecommendation": "PASS",
        "evidenceQuotes": ["Quote 1 here", "Quote 2 here", "Quote 3 here"],
        "teachingStyle": "example-driven",
        "riskFlags": ["none"],
        "keyHighlights": ["Used excellent pizza analogy"],
        "consistencyAnalysis": "Candidate consistently maintained a warm tone...",
        "communicationStyleAnalysis": {
           "structure": "excellent, highly logical",
           "examplesUsed": true,
           "stepByStep": true
        }
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
        engagement: { score: 5, reasoning: "Evaluation generation failed." },
        overallRecommendation: "FAIL",
        evidenceQuotes: [],
        teachingStyle: "unknown",
        riskFlags: ["System fault"],
        keyHighlights: [],
        consistencyAnalysis: "Could not evaluate due to system error.",
        communicationStyleAnalysis: { structure: "unknown", examplesUsed: false, stepByStep: false }
      };
    }
  }
}
