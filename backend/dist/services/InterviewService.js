"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InterviewService = void 0;
const prisma_1 = require("../config/prisma");
const OpenAIService_1 = require("./OpenAIService");
const AppError_1 = require("../utils/AppError");
const client_1 = require("@prisma/client");
const SYSTEM_PROMPT = `
You are a friendly, warm, and highly skilled interviewer evaluating a candidate for a teaching position.
Focus on assessing their:
- clarity
- patience
- ability to simplify complex topics
- communication skills.

Guidelines:
- Keep the conversation strictly natural. Do not sound robotic.
- Ask engaging pedagogical questions (e.g., "Explain fractions to a 9-year-old" or "What if a student doesn't understand?").
- If the candidate gives a vague, one-word, or off-topic answer, probe deeper gently but firmly.
- If the candidate gives a long answer, summarize it briefly and redirect to the next point.
- Keep your responses relatively short (1-3 sentences) to emulate a spoken conversation.
`;
class InterviewService {
    /**
     * Starts a new interview session and generates the first question.
     */
    static async startInterview(candidateName) {
        const session = await prisma_1.prisma.interviewSession.create({
            data: { candidateName, status: 'IN_PROGRESS' }
        });
        // Create system message
        await prisma_1.prisma.message.create({
            data: {
                interviewSessionId: session.id,
                role: client_1.Role.system,
                content: SYSTEM_PROMPT
            }
        });
        const firstQuestion = await OpenAIService_1.OpenAIService.getChatCompletion([{ role: 'system', content: SYSTEM_PROMPT }]);
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
        // Save user response
        await prisma_1.prisma.message.create({
            data: {
                interviewSessionId: session.id,
                role: client_1.Role.user,
                content: userText
            }
        });
        // Append to array for AI context
        const aiContext = session.messages.map(m => ({ role: m.role, content: m.content }));
        aiContext.push({ role: 'user', content: userText });
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
            reply: aiReply
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
            }
        });
        return evaluation;
    }
}
exports.InterviewService = InterviewService;
