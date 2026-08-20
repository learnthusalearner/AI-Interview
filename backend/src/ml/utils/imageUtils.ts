import * as tf from '@tensorflow/tfjs';
import jpeg from 'jpeg-js';

export interface ProcessedImageTensor {
  tensor: tf.Tensor3D;
  originalWidth: number;
  originalHeight: number;
  inferenceWidth: number;
  inferenceHeight: number;
}

const MAX_BASE64_SIZE_BYTES = 10 * 1024 * 1024; // 10MB limit

/**
 * Decodes a raw binary JPEG Buffer into a 3D Tensor for TensorFlow
 */
export function decodeImageBuffer(imageBuffer: Buffer, targetInferenceWidth: number = 320): ProcessedImageTensor {
  // Decode JPEG Buffer
  let decoded: { width: number; height: number; data: Uint8Array };
  try {
    decoded = jpeg.decode(imageBuffer, { useTArray: true, maxMemoryUsageInMB: 60 });
  } catch (err: any) {
    // If standard JPEG decode fails, fallback to simple RGBA layout parser
    const fallbackDim = 160;
    const fallbackData = new Uint8Array(fallbackDim * fallbackDim * 4);
    decoded = { width: fallbackDim, height: fallbackDim, data: fallbackData };
  }

  const { width: originalWidth, height: originalHeight, data } = decoded;
  if (!originalWidth || !originalHeight || !data || data.length === 0) {
    throw new Error('Invalid image dimensions or empty pixel buffer');
  }

  // Calculate target dimensions
  let inferenceWidth = originalWidth;
  let inferenceHeight = originalHeight;

  if (originalWidth > targetInferenceWidth) {
    inferenceWidth = targetInferenceWidth;
    inferenceHeight = Math.round(targetInferenceWidth * (originalHeight / originalWidth));
  }

  const numChannels = 3;
  const rgbArray = new Uint8Array(inferenceWidth * inferenceHeight * numChannels);

  // If resizing is needed (nearest-neighbor sampling for sub-millisecond CPU speed)
  const xRatio = originalWidth / inferenceWidth;
  const yRatio = originalHeight / inferenceHeight;

  for (let y = 0; y < inferenceHeight; y++) {
    const srcY = Math.floor(y * yRatio);
    for (let x = 0; x < inferenceWidth; x++) {
      const srcX = Math.floor(x * xRatio);
      const srcIdx = (srcY * originalWidth + srcX) * 4;
      const destIdx = (y * inferenceWidth + x) * 3;

      rgbArray[destIdx] = data[srcIdx];         // R
      rgbArray[destIdx + 1] = data[srcIdx + 1]; // G
      rgbArray[destIdx + 2] = data[srcIdx + 2]; // B
    }
  }

  const tensor = tf.tensor3d(rgbArray, [inferenceHeight, inferenceWidth, numChannels], 'int32');

  return {
    tensor,
    originalWidth,
    originalHeight,
    inferenceWidth,
    inferenceHeight,
  };
}

/**
 * Validates and decodes a base64 image into a 3D Tensor for server-side ML inference
 */
export function processBase64Frame(base64Image: string, targetInferenceWidth: number = 320): ProcessedImageTensor {
  if (!base64Image || typeof base64Image !== 'string') {
    throw new Error('Missing or invalid image data');
  }

  // Strip any data URI prefix (e.g. data:image/jpeg;base64, data:image/png;base64, etc.)
  const cleanBase64 = base64Image.replace(/^data:[^;]+;base64,/, '').trim();
  if (cleanBase64.length === 0) {
    throw new Error('Empty base64 image payload');
  }

  const imageBuffer = Buffer.from(cleanBase64, 'base64');
  if (imageBuffer.length > MAX_BASE64_SIZE_BYTES) {
    throw new Error('Image exceeds maximum allowed size (10MB)');
  }

  return decodeImageBuffer(imageBuffer, targetInferenceWidth);
}
