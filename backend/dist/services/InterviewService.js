"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.InterviewService = void 0;
const prisma_1 = require("../config/prisma");
const OpenAIService_1 = require("./OpenAIService");
const AppError_1 = require("../utils/AppError");
const client_1 = require("@prisma/client");
const SYSTEM_PROMPT = `You are an AI interviewer evaluating tutor candidates for teaching children in a warm, natural spoken style.

Your primary goal is to assess the soft skills required for tutoring. This isn't about testing deep math knowledge. It's about the soft stuff:
1. communication clarity – logical, easy to follow
2. ability to simplify – child-friendly, age-appropriate language and examples
3. patience – supportive responses when a student struggles
4. warmth – empathy, encouragement, and positive tone
5. English fluency – natural, easy-to-follow English flow

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
❓ QUESTION STRATEGY
--------------------------------------------------
Use 5 to 7 strong conversational questions to reveal their true tutoring ability. Use up to 10 limits if deep follow-ups are needed.

Ask highly situational and behavioral questions, such as:
1. "Explain fractions to a 9-year-old."
2. "A student says they don't understand — they've been staring at the problem for 5 minutes. What do you do?"
3. "How do you respond when a student says 'I’m just entirely awful at math'?"
4. "Teach me the concept of negative numbers right now, pretending I am an 8-year-old."
5. "A child gets a question wrong and starts crying. How do you comfort them while keeping the lesson moving?"

Adapt based on the candidate’s responses!

--------------------------------------------------
🔄 ADAPTIVE BEHAVIOR
--------------------------------------------------
If they use generic analogies ("I would make it fun"), immediately push back: "That sounds good, but could you give me a specific example of how you'd make it fun?"
If the answer is too complex, ask them to simplify it for a young child.

--------------------------------------------------
⚠️ RULES
--------------------------------------------------
- Never switch to Urdu, Hindi, or any other language.
- Do not teach the student yourself; remain an interviewer.
- Do not ask purely factual questions or test raw academic knowledge.
- Do not sound robotic, scripted, or overly formal.
- Do not change the subject away from teaching practice.

Begin by greeting the candidate warmly and asking the first question. Make sure to RANDOMIZE the first scenario you pick so different candidates get different starting questions.
`;
class InterviewService {
    /**
     * Starts a new interview session and generates the first question.
     */
    static async startInterview(candidateName, candidateEmail) {
        const session = await prisma_1.prisma.interviewSession.create({
            data: { candidateName, candidateEmail, status: 'IN_PROGRESS' }
        });
        // Create system message
        await prisma_1.prisma.message.create({
            data: {
                interviewSessionId: session.id,
                role: client_1.Role.system,
                content: SYSTEM_PROMPT
            }
        });
        // Create a uniquely seeded prompt for the first completion to force variety
        const initPrompt = `${SYSTEM_PROMPT}\n\n[System Seed: ${Math.random()}]\nPick a highly randomized pedagogical math topic for the first question to ensure variety.`;
        const firstQuestion = await OpenAIService_1.OpenAIService.getChatCompletion([{ role: 'system', content: initPrompt }]);
        // Save assistant's first question
        await prisma_1.prisma.message.create({
            data: {
                interviewSessionId: session.id,
                role: client_1.Role.assistant,
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
    static async respondToInterview(sessionId, userText) {
        const session = await prisma_1.prisma.interviewSession.findUnique({
            where: { id: sessionId },
            include: { messages: { orderBy: { createdAt: 'asc' } } }
        });
        if (!session)
            throw new AppError_1.AppError('Session not found', 404);
        if (session.status === 'COMPLETED')
            throw new AppError_1.AppError('Session already completed', 400);
        // Retrieve the last AI question for context
        const lastMessage = session.messages.length > 0 ? session.messages[session.messages.length - 1] : null;
        const aiQuestion = lastMessage && lastMessage.role === 'assistant' ? lastMessage.content : 'General pedagogical scenario';
        // Micro-evaluate the user's answer
        const evalData = await OpenAIService_1.OpenAIService.evaluateSingleAnswer(aiQuestion, userText);
        // Save user response with metrics
        await prisma_1.prisma.message.create({
            data: {
                interviewSessionId: session.id,
                role: client_1.Role.user,
                content: userText,
                clarity: evalData.clarity,
                warmth: evalData.warmth,
                simplicity: evalData.simplicity,
                patience: evalData.patience,
                fluency: evalData.fluency
            }
        });
        const userMessageCount = session.messages.filter((m) => m.role === 'user').length + 1;
        // Append to array for AI context
        const aiContext = session.messages.map(m => ({ role: m.role, content: m.content }));
        aiContext.push({ role: 'user', content: userText });
        // Adaptive System Cutoff Instruction
        if (userMessageCount >= 10) {
            aiContext.push({
                role: 'system',
                content: 'SYSTEM INSTRUCTION: MAX QUESTIONS REACHED. End the interview gracefully.'
            });
        }
        const aiReply = await OpenAIService_1.OpenAIService.getChatCompletion(aiContext);
        // Save assistant response
        const assistantMessage = await prisma_1.prisma.message.create({
            data: {
                interviewSessionId: session.id,
                role: client_1.Role.assistant,
                content: aiReply
            }
        });
        return {
            reply: aiReply,
            cutoff: userMessageCount >= 10
        };
    }
    /**
     * Completes and evaluates the session
     */
    static async evaluateSession(sessionId) {
        const session = await prisma_1.prisma.interviewSession.findUnique({
            where: { id: sessionId },
            include: { messages: { orderBy: { createdAt: 'asc' } } }
        });
        if (!session)
            throw new AppError_1.AppError('Session not found', 404);
        const apiMessages = session.messages
            .filter((m) => m.role !== 'system')
            .map(m => ({ role: m.role, content: m.content }));
        const evaluation = await OpenAIService_1.OpenAIService.evaluateInterview(apiMessages);
        // Update session
        await prisma_1.prisma.interviewSession.update({
            where: { id: sessionId },
            data: {
                status: 'COMPLETED',
                evaluationData: evaluation,
                overallRecommendation: evaluation.overallRecommendation || 'UNKNOWN',
                totalScore: (evaluation.clarity?.score || 0) + (evaluation.warmth?.score || 0) + (evaluation.simplicity?.score || 0) + (evaluation.patience?.score || 0) + (evaluation.fluency?.score || 0)
            }
        });
        return evaluation;
    }
    /**
     * Submit candidate feedback for a completed session
     */
    static async submitFeedback(sessionId, feedback) {
        const session = await prisma_1.prisma.interviewSession.findUnique({ where: { id: sessionId } });
        if (!session)
            throw new AppError_1.AppError('Session not found', 404);
        return await prisma_1.prisma.interviewSession.update({
            where: { id: sessionId },
            data: { feedback }
        });
    }
    /**
     * Get all sessions for a specific candidate by email
     */
    static async getSessionsByEmail(email) {
        return await prisma_1.prisma.interviewSession.findMany({
            where: { candidateEmail: email },
            orderBy: { createdAt: 'desc' }
        });
    }
    /**
     * Update application status and send email
     */
    static async updateApplicationStatus(sessionId, status) {
        const session = await prisma_1.prisma.interviewSession.findUnique({ where: { id: sessionId } });
        if (!session)
            throw new AppError_1.AppError('Session not found', 404);
        const updatedSession = await prisma_1.prisma.interviewSession.update({
            where: { id: sessionId },
            data: { applicationStatus: status }
        });
        // We'll call the EmailService here, but since we are inside InterviewService,
        // let's just let the controller handle Email injection to avoid circular deps, 
        // or we can import EmailService since it's a sibling.
        const { EmailService } = await Promise.resolve().then(() => __importStar(require('./EmailService')));
        if (session.candidateEmail) {
            await EmailService.sendDecisionEmail(session.candidateEmail, status, session.candidateName);
        }
        return updatedSession;
    }
}
exports.InterviewService = InterviewService;
