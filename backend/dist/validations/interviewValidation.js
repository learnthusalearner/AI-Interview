"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateInterviewSchema = exports.respondInterviewSchema = exports.startInterviewSchema = void 0;
const zod_1 = require("zod");
exports.startInterviewSchema = zod_1.z.object({
    body: zod_1.z.object({
        candidateName: zod_1.z.string().min(2, 'Name must be at least 2 characters'),
    }),
});
exports.respondInterviewSchema = zod_1.z.object({
    body: zod_1.z.object({
        sessionId: zod_1.z.string().uuid('Invalid Session ID'),
        text: zod_1.z.string().min(1, 'Response text cannot be empty'),
    }),
});
exports.evaluateInterviewSchema = zod_1.z.object({
    body: zod_1.z.object({
        sessionId: zod_1.z.string().uuid('Invalid Session ID'),
    }),
});
