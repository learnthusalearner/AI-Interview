"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoiceController = void 0;
const OpenAIService_1 = require("../services/OpenAIService");
const AppError_1 = require("../utils/AppError");
const fs_1 = __importDefault(require("fs"));
class VoiceController {
    static async processInput(req, res) {
        if (!req.file) {
            throw new AppError_1.AppError('No audio file provided', 400);
        }
        try {
            const transcript = await OpenAIService_1.OpenAIService.transcribeAudio(req.file.path);
            // Clean up the temp file after processing
            fs_1.default.unlink(req.file.path, (err) => {
                if (err)
                    console.error(`Failed to delete temp file: ${err.message}`);
            });
            res.status(200).json({ success: true, data: { transcript } });
        }
        catch (error) {
            // Clean up file if error
            fs_1.default.unlink(req.file.path, () => { });
            throw error;
        }
    }
}
exports.VoiceController = VoiceController;
