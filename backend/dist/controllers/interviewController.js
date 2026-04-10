"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InterviewController = void 0;
const InterviewService_1 = require("../services/InterviewService");
class InterviewController {
    static async start(req, res) {
        try {
            const { candidateName, candidateEmail } = req.body;
            const result = await InterviewService_1.InterviewService.startInterview(candidateName, candidateEmail);
            res.status(201).json({ success: true, data: result });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
    static async respond(req, res) {
        try {
            const { sessionId, text } = req.body;
            const result = await InterviewService_1.InterviewService.respondToInterview(sessionId, text);
            res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
    static async evaluate(req, res) {
        try {
            const { sessionId } = req.body;
            const result = await InterviewService_1.InterviewService.evaluateSession(sessionId);
            res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
    static async submitFeedback(req, res) {
        try {
            const { sessionId, feedback } = req.body;
            const result = await InterviewService_1.InterviewService.submitFeedback(sessionId, feedback);
            res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
    static async getSessionsByEmail(req, res) {
        try {
            const { email } = req.params;
            const result = await InterviewService_1.InterviewService.getSessionsByEmail(email);
            res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
}
exports.InterviewController = InterviewController;
