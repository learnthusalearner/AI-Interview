"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const voiceController_1 = require("../../controllers/voiceController");
const multerConfig_1 = require("../../middlewares/multerConfig");
const router = (0, express_1.Router)();
router.post('/input', multerConfig_1.audioUploadHandler.single('audio'), voiceController_1.VoiceController.processInput);
exports.default = router;
