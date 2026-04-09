"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.audioUploadHandler = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Make sure temp directory exists
const tempDir = path_1.default.join(process.cwd(), 'temp_audio');
if (!fs_1.default.existsSync(tempDir)) {
    fs_1.default.mkdirSync(tempDir, { recursive: true });
}
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, tempDir);
    },
    filename: (req, file, cb) => {
        const ext = path_1.default.extname(file.originalname) || '.m4a'; // default to m4a if none
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `audio-${uniqueSuffix}${ext}`);
    },
});
exports.audioUploadHandler = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 25 * 1024 * 1024, // 25 MB max size for Whisper
    },
});
