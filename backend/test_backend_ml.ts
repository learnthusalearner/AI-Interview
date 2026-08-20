import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-cpu';
import { inferenceService } from './src/ml/services/inferenceService';
import jpeg from 'jpeg-js';

async function testBackendFaceDetection() {
  console.log('1. Initializing models...');
  await inferenceService.initialize();

  console.log('2. Health check:', inferenceService.getHealth());

  // Create a synthetic 320x240 RGB image
  const width = 320;
  const height = 240;
  const rawData = Buffer.alloc(width * height * 4);

  // Draw a simulated face region (skin tone circle/square in center)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      if (x >= 100 && x <= 220 && y >= 60 && y <= 180) {
        rawData[idx] = 230;     // R
        rawData[idx + 1] = 180; // G
        rawData[idx + 2] = 140; // B
        rawData[idx + 3] = 255; // A
      } else {
        rawData[idx] = 40;
        rawData[idx + 1] = 40;
        rawData[idx + 2] = 40;
        rawData[idx + 3] = 255;
      }
    }
  }

  const jpegBuffer = jpeg.encode({ data: rawData, width, height }, 70);
  const base64Image = `data:image/jpeg;base64,${jpegBuffer.data.toString('base64')}`;

  console.log('3. Running detection on synthetic frame...');
  const result = await inferenceService.runDetection(base64Image);
  console.log('4. Inference Result:', JSON.stringify(result, null, 2));
}

testBackendFaceDetection().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
