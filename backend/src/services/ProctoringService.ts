import * as tf from '@tensorflow/tfjs';
// Polyfill needed for web APIs used by TFJS modules occasionally, but shouldn't strictly need window if we just use cpu backend
import '@tensorflow/tfjs-backend-cpu';
import * as blazeface from '@tensorflow-models/blazeface';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import jpeg from 'jpeg-js';
import { logger } from '../config/logger';

class ProctoringServiceClass {
  private faceModel: blazeface.BlazeFaceModel | null = null;
  private objectModel: cocoSsd.ObjectDetection | null = null;
  private isInitializing = false;

  constructor() {
    this.initP()
  }

  public async initP() {
      if (this.isInitializing || (this.faceModel && this.objectModel)) return;
      this.isInitializing = true;
      try {
        await tf.ready();
        
        logger.info("Initializing Proctoring Models (Blazeface & COCO-SSD)...");
        const [fModel, oModel] = await Promise.all([
          blazeface.load(),
          cocoSsd.load()
        ]);
        
        this.faceModel = fModel;
        this.objectModel = oModel;
        logger.info("Proctoring Models loaded successfully.");
      } catch (e: any) {
        logger.error(`Failed to load Proctoring Models: ${e.message}`);
      } finally {
        this.isInitializing = false;
      }
  }

  public async analyzeFrame(base64Image: string): Promise<{ faceDetected: boolean; phoneDetected: boolean; error?: string }> {
    if (!this.faceModel || !this.objectModel) {
      // Re-init just in case
      await this.initP();
      
      if (!this.faceModel || !this.objectModel) {
        return { faceDetected: false, phoneDetected: false, error: 'Models not loaded yet' };
      }
    }

    let tensor: tf.Tensor3D | null = null;
    
    try {
      // Remove base64 header if present
      const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
      const imageBuffer = Buffer.from(base64Data, 'base64');
      
      // Decode JPEG
      const rawImageData = jpeg.decode(imageBuffer, { useTArray: true, maxMemoryUsageInMB: 50 });
      
      // jpeg-js decoding returns data as Uint8Array with 4 channels (RGBA)
      const { width, height, data } = rawImageData;
      const numChannels = 3;
      const rgbArray = new Uint8Array(width * height * numChannels);

      for (let i = 0; i < width * height; i++) {
        rgbArray[i * 3] = data[i * 4];     // R
        rgbArray[i * 3 + 1] = data[i * 4 + 1]; // G
        rgbArray[i * 3 + 2] = data[i * 4 + 2]; // B
      }

      tensor = tf.tensor3d(rgbArray, [height, width, numChannels], 'int32');

      const facePredictions = await this.faceModel.estimateFaces(tensor, false);
      const faceDetected = facePredictions && facePredictions.length > 0;

      const objectPredictions = await this.objectModel.detect(tensor);
      const phoneDetected = objectPredictions.some((obj: any) => obj.class === "cell phone");

      return { faceDetected, phoneDetected };
    } catch (e: any) {
      logger.error(`Frame analysis error: ${e.message}`);
      return { faceDetected: false, phoneDetected: false, error: e.message };
    } finally {
      if (tensor) {
        tensor.dispose();
      }
    }
  }
}

export const ProctoringService = new ProctoringServiceClass();
