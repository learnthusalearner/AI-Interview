"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InterviewController = void 0;
const InterviewService_1 = require("../services/InterviewService");
class InterviewController {
    static async start(req, res) {
        const { candidateName } = req.body;
        const result = await InterviewService_1.InterviewService.startInterview(candidateName);
        res.status(201).json({ success: true, data: result });
    }
    static async respond(req, res) {
        const { sessionId, text } = req.body;
        const result = await InterviewService_1.InterviewService.respondToInterview(sessionId, text);
        res.status(200).json({ success: true, data: result });
    }
    static async evaluate(req, res) {
        const { sessionId } = req.body;
        const result = await InterviewService_1.InterviewService.evaluateSession(sessionId);
        res.status(200).json({ success: true, data: result });
    }
}
exports.InterviewController = InterviewController;
