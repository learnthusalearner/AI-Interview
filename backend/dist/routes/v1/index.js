"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const voiceRoutes_1 = __importDefault(require("./voiceRoutes"));
const interviewRoutes_1 = __importDefault(require("./interviewRoutes"));
const router = (0, express_1.Router)();
router.use('/voice', voiceRoutes_1.default);
router.use('/interview', interviewRoutes_1.default);
exports.default = router;
