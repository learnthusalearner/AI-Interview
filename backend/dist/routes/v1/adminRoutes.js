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
const express_1 = require("express");
const prisma_1 = require("../../config/prisma");
const router = (0, express_1.Router)();
router.get('/candidates', async (req, res, next) => {
    try {
        const sessions = await prisma_1.prisma.interviewSession.findMany({
            where: { status: 'COMPLETED' },
            orderBy: { totalScore: 'desc' },
            select: {
                id: true,
                candidateName: true,
                candidateEmail: true,
                applicationStatus: true,
                overallRecommendation: true,
                totalScore: true,
                evaluationData: true,
                feedback: true,
                createdAt: true,
                messages: {
                    where: { role: { not: 'system' } },
                    select: { role: true, content: true, clarity: true, warmth: true, simplicity: true, patience: true, fluency: true, createdAt: true },
                    orderBy: { createdAt: 'asc' }
                }
            }
        });
        return res.status(200).json({ status: 'success', data: sessions });
    }
    catch (error) {
        next(error);
    }
});
router.post('/status', async (req, res, next) => {
    try {
        const { sessionId, status } = req.body;
        const { InterviewService } = await Promise.resolve().then(() => __importStar(require('../../services/InterviewService')));
        const updatedSession = await InterviewService.updateApplicationStatus(sessionId, status);
        return res.status(200).json({ status: 'success', data: updatedSession });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
