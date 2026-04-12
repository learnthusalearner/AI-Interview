import { prisma } from '../config/prisma';
import { OpenAIService } from './OpenAIService';
import { EmailService } from './EmailService';
import { AppError } from '../utils/AppError';
import { Role } from '@prisma/client';

const SYSTEM_PROMPT = `You are an AI interviewer evaluating tutor candidates for teaching children in a warm, natural spoken style.

Your primary goal is to assess the soft skills required for tutoring. This isn't about testing deep math knowledge. It's about the soft stuff:
1. communication clarity – logical, easy to follow
2. ability to simplify – child-friendly, age-appropriate language and examples
3. patience – supportive responses when a student struggles
4. warmth – empathy, encouragement, and positive tone
5. English fluency – natural, easy-to-follow English flow

--------------------------------------------------
📋 INTERVIEW STRUCTURE
--------------------------------------------------
- You MUST conduct exactly 10 conversational turns.
- Distribute your engagement systematically: Ask 6 to 7 "hardcore" foundational teaching scenario questions, and 3 to 4 deep follow-up questions challenging their previous answers.
- The system will inject context detailing which turn you are on. Guide the pacing accordingly.

--------------------------------------------------
🎭 TEACHING SIMULATION MODE
--------------------------------------------------
- You are not just an interviewer; you must act like a confused 8-year-old student interacting with a tutor.
- Interrupt occasionally, act confused, and ask "Why?" or "Can you explain that more simply?"
- Present unique behavioral challenges (e.g., "I don't understand, my parents taught me differently!" or "I'm bored, can we play a game instead?").

--------------------------------------------------
🗣️ CONVERSATION STYLE
--------------------------------------------------
- Keep the conversation strictly natural, not robotic.
- Listen, respond, and adapt to exactly what the candidate just said.
- Follow up aggressively on vague answers. Don't let them give generic platitudes; ask them "How exactly would you do that?"
- Keep it flowing dynamically. Acknowledge what they said before moving to a new topic.
- Use short spoken-style turns (1-3 sentences maximum).
- Always stay in English.

--------------------------------------------------
🔄 ADAPTIVE BEHAVIOR & RAMBLING CONTROL
--------------------------------------------------
- If the candidate gives an extremely long monlogue, interrupt them: "That's a lot of information, I'm a bit lost. Can you summarize?"
- If they use generic analogies ("I would make it fun"), push back: "That sounds good, but could you give me a specific example of how you'd make it fun?"
- If the answer is too complex or uses jargon, ask them to simplify it for a young child.

--------------------------------------------------
✨ MICRO-FEEDBACK SYSTEM
--------------------------------------------------
- Provide occasional, brief positive reinforcement when they do well (e.g., "Oh, that's a great example!", "I like how you explained that."). This tests their flow and keeps the tone warm.

--------------------------------------------------
⚠️ RULES & BIAS CONTROL
--------------------------------------------------
- Never penalize a candidate for their accent or minor grammar mistakes.
- Never switch to Urdu, Hindi, or any other language.
- Do not teach the student yourself; remain an interviewer/student.
- Do not ask purely factual questions or test raw academic knowledge.
- Do not sound robotic, scripted, or overly formal.
- Do not change the subject away from teaching practice.

Begin by greeting the candidate warmly, providing a friendly human-like intro, and asking the first creative scenario-based problem. Make sure to highly RANDOMIZE the first scenario you pick so different candidates get completely different starting experiences.
`;

export class InterviewService {
  /**
   * Starts a new interview session and generates the first question.
   */
  static async startInterview(candidateName: string, candidateEmail?: string) {
    const session = await prisma.interviewSession.create({
      data: { candidateName, candidateEmail, status: 'IN_PROGRESS' }
    });

    // Create system message
    await prisma.message.create({
      data: {
        interviewSessionId: session.id,
        role: Role.system,
        content: SYSTEM_PROMPT
      }
    });

    // Create a uniquely seeded prompt for the first completion to force variety
    const initPrompt = `${SYSTEM_PROMPT}\n\n[System Seed: ${Math.random()}]\nPick a highly creative and uniquely randomized pedagogical topic or behavioral scenario for the first question to ensure variety.`;
    const firstQuestion = await OpenAIService.getChatCompletion([{ role: 'system', content: initPrompt }]);

    // Save assistant's first question
    await prisma.message.create({
      data: {
        interviewSessionId: session.id,
        role: Role.assistant,
        content: firstQuestion
      }
    });

    return {
      sessionId: session.id,
      question: firstQuestion
    };
  }

  /**
   * Process a candidate's response and fetch the AI's next reply
   */
  static async respondToInterview(sessionId: string, userText: string) {
    const session = await prisma.interviewSession.findUnique({
      where: { id: sessionId },
      include: { messages: { orderBy: { createdAt: 'asc' } } }
    });

    if (!session) throw new AppError('Session not found', 404);
    if (session.status === 'COMPLETED') throw new AppError('Session already completed', 400);

    // Retrieve the last AI question for context
    const lastMessage = session.messages.length > 0 ? session.messages[session.messages.length - 1] : null;
    const aiQuestion = lastMessage && lastMessage.role === 'assistant' ? lastMessage.content : 'General pedagogical scenario';

    // Micro-evaluate the user's answer
    const evalData = await OpenAIService.evaluateSingleAnswer(aiQuestion, userText);

    // Save user response with metrics
    await prisma.message.create({
      data: {
        interviewSessionId: session.id,
        role: Role.user,
        content: userText,
        clarity: evalData.clarity,
        warmth: evalData.warmth,
        simplicity: evalData.simplicity,
        patience: evalData.patience,
        fluency: evalData.fluency,
        engagement: evalData.engagement
      }
    });

    const userMessageCount = session.messages.filter((m) => m.role === 'user').length + 1;

    // Append to array for AI context
    const aiContext = session.messages.map(m => ({ role: m.role, content: m.content }));
    aiContext.push({ role: 'user', content: userText });

    let shouldCutoff = userMessageCount >= 10;

    // Early termination for unsatisfactory/off-topic response
    if (evalData.responseQuality === "off-topic" || evalData.responseQuality === "unsatisfactory" || evalData.average < 3) {
      shouldCutoff = true;
      aiContext.push({
        role: 'system',
        content: "SYSTEM INSTRUCTION: The candidate's last answer was completely unsatisfactory or off-topic. Inform them politely but firmly that the interview is being terminated early due to this, and end the conversation immediately in one sentence."
      });
    } else {
      // Normal pacing and edge-case injection
      aiContext.push({
        role: 'system',
        content: `SYSTEM INSTRUCTION: This is turn ${userMessageCount}/10. Keep the distribution in mind (6-7 new scenarios, 3-4 follow ups).`
      });

      if (evalData.responseQuality === "vague") {
        aiContext.push({
          role: 'system',
          content: "SYSTEM INSTRUCTION: The candidate's last response was vague. Push them to be much more specific."
        });
      } else if (evalData.responseQuality === "complex") {
        aiContext.push({
          role: 'system',
          content: 'SYSTEM INSTRUCTION: The candidate is using language that is too complex. Act confused and ask them to simplify.'
        });
      }

      if (userMessageCount >= 10) {
         aiContext.push({ 
             role: 'system', 
             content: 'SYSTEM INSTRUCTION: MAX QUESTIONS REACHED. End the interview gracefully.'
         });
      }
    }

    const aiReply = await OpenAIService.getChatCompletion(aiContext);

    // Save assistant response
    const assistantMessage = await prisma.message.create({
      data: {
        interviewSessionId: session.id,
        role: Role.assistant,
        content: aiReply
      }
    });

    return {
      reply: aiReply,
      cutoff: shouldCutoff
    };
  }

  /**
   * Completes and evaluates the session
   */
  static async evaluateSession(sessionId: string, videoEngagementScore?: number, cheatFlags?: string[]) {
    const session = await prisma.interviewSession.findUnique({
      where: { id: sessionId },
      include: { messages: { orderBy: { createdAt: 'asc' } } }
    });

    if (!session) throw new AppError('Session not found', 404);

    const apiMessages = session.messages
      .filter((m) => m.role !== 'system')
      .map(m => ({ role: m.role, content: m.content }));

    const userMessageCount = apiMessages.filter(m => m.role === 'user').length;
    const evaluation = await OpenAIService.evaluateInterview(apiMessages, userMessageCount);
    
    // Inject visual score override if front-end ML processed it
    if (videoEngagementScore !== undefined && typeof videoEngagementScore === 'number' && evaluation.engagement) {
      evaluation.engagement.score = videoEngagementScore;
      evaluation.engagement.reasoning = `(Visual Override) Camera tracking detected ${videoEngagementScore * 10}% visual engagement during the session.`;
    }

    let totalCheatCount = 0;
    if (cheatFlags && cheatFlags.length > 0) {
      const mobileCount = cheatFlags.filter(f => f === "MOBILE_PHONE").length;
      const absentCount = cheatFlags.filter(f => f === "ABSENT_USER").length;
      totalCheatCount = mobileCount + absentCount;

      evaluation.proctoringSummary = {
         mobilePhoneCount: mobileCount,
         absenceCount: absentCount
      };

      const customFlags = [];
      if (mobileCount > 0) customFlags.push(`PROCTOR VIOLATION: Unauthorized device (Mobile) detected ${mobileCount} time(s).`);
      if (absentCount > 0) customFlags.push(`PROCTOR VIOLATION: Candidate left camera view ${absentCount} time(s).`);

      evaluation.riskFlags = [...(evaluation.riskFlags || []), ...customFlags];
      evaluation.overallRecommendation = "FLAGGED";
    }

    // Update session
    await prisma.interviewSession.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        cheatCount: totalCheatCount,
        evaluationData: evaluation,
        overallRecommendation: evaluation.overallRecommendation || 'UNKNOWN',
        totalScore: (evaluation.clarity?.score || 0) + (evaluation.warmth?.score || 0) + (evaluation.simplicity?.score || 0) + (evaluation.patience?.score || 0) + (evaluation.fluency?.score || 0) + (evaluation.engagement?.score || 0)
      }
    });

    return evaluation;
  }

  /**
   * Submit candidate feedback for a completed session
   */
  static async submitFeedback(sessionId: string, feedback: string) {
    const session = await prisma.interviewSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new AppError('Session not found', 404);

    return await prisma.interviewSession.update({
      where: { id: sessionId },
      data: { feedback }
    });
  }

  /**
   * Get all sessions for a specific candidate by email
   */
  static async getSessionsByEmail(email: string) {
    return await prisma.interviewSession.findMany({
      where: { candidateEmail: email },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Update application status and send email
   */
  static async updateApplicationStatus(sessionId: string, status: 'ACCEPTED' | 'REJECTED', feedbackReason?: string) {
    const session = await prisma.interviewSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new AppError('Session not found', 404);

    let fraudEvaluationData = undefined;
    if (feedbackReason && status === 'REJECTED') {
      fraudEvaluationData = {
        overallRecommendation: "TERMINATED",
        teachingStyle: "UNAUTHORIZED",
        keyHighlights: ["Interview was abruptly ended due to an automated proctoring violation."],
        riskFlags: [`PROCTOR VIOLATION: ${feedbackReason}`],
        clarity: {score: 0}, warmth: {score: 0}, simplicity: {score: 0}, patience: {score: 0}, fluency: {score: 0}, engagement: {score: 0}
      };
    }

    const updatedSession = await prisma.interviewSession.update({
      where: { id: sessionId },
      data: { 
        applicationStatus: status,
        ...(fraudEvaluationData ? { evaluationData: fraudEvaluationData, overallRecommendation: 'TERMINATED', totalScore: 0 } : {})
      }
    });
    
    if (session.candidateEmail) {
      // Fire-and-forget email dispatch to prevent blocking the admin UI / hanging
      EmailService.sendDecisionEmail(session.candidateEmail, status, session.candidateName).catch(err => {
        console.error(`Failed to dispatch email asynchronously for ${sessionId}:`, err);
      });
    } else {
      console.warn(`No candidate email found for session ${sessionId}. Skipping email dispatch.`);
    }

    return updatedSession;
  }
}
