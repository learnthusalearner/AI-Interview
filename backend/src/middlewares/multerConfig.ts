import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Make sure temp directory exists
const tempDir = path.join(process.cwd(), 'temp_audio');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.m4a'; // default to m4a if none
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `audio-${uniqueSuffix}${ext}`);
  },
});

export const audioUploadHandler = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB max size for Whisper
  },
});
