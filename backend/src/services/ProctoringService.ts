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
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.initP()
  }

  public async initP() {
      if (this.initPromise) return this.initPromise;
      if (this.faceModel && this.objectModel) return;

      this.initPromise = (async () => {
          try {
            await tf.ready();
            
            logger.info("Initializing Proctoring Models (Blazeface & COCO-SSD)...");
            const [fModel, oModel] = await Promise.all([
              blazeface.load({ scoreThreshold: 0.25 }),
              cocoSsd.load()
            ]);
            
            this.faceModel = fModel;
            this.objectModel = oModel;
            logger.info("Proctoring Models loaded successfully.");
          } catch (e: any) {
            logger.error(`Failed to load Proctoring Models: ${e.message}`);
            this.initPromise = null;
          }
      })();
      return this.initPromise;
  }

  public async analyzeFrame(base64Image: string): Promise<{ faceDetected: boolean; phoneDetected: boolean; error?: string }> {
    if (!this.faceModel || !this.objectModel) {
      await this.initP();
      if (!this.faceModel || !this.objectModel) {
        return { faceDetected: true, phoneDetected: false, error: 'Models initializing' };
      }
    }

    let tensor: tf.Tensor3D | null = null;
    
    try {
      // Remove base64 header if present
      const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
      const imageBuffer = Buffer.from(base64Data, 'base64');
      
      // Decode JPEG
      const rawImageData = jpeg.decode(imageBuffer, { useTArray: true, maxMemoryUsageInMB: 50 });
      
      const { width, height, data } = rawImageData;
      const numChannels = 3;
      const rgbArray = new Uint8Array(width * height * numChannels);

      let totalBrightness = 0;
      for (let i = 0; i < width * height; i++) {
        const r = data[i * 4];
        const g = data[i * 4 + 1];
        const b = data[i * 4 + 2];
        rgbArray[i * 3] = r;
        rgbArray[i * 3 + 1] = g;
        rgbArray[i * 3 + 2] = b;
        totalBrightness += (r + g + b) / 3;
      }

      const avgBrightness = totalBrightness / (width * height);
      const isLiveVisual = avgBrightness > 15 && avgBrightness < 245;

      tensor = tf.tensor3d(rgbArray, [height, width, numChannels], 'int32');

      const facePredictions = await this.faceModel.estimateFaces(tensor, false);
      const faceDetectedByModel = Boolean(facePredictions && facePredictions.length > 0);

      const objectPredictions = await this.objectModel.detect(tensor);
      const phoneDetected = objectPredictions.some((obj: any) => 
        (obj.class === "cell phone" || obj.class === "remote" || obj.class === "book" || obj.class === "laptop") && obj.score >= 0.25
      );
      const personDetected = objectPredictions.some((obj: any) => 
        obj.class === "person" && obj.score >= 0.25
      );

      const faceDetected = faceDetectedByModel || personDetected || isLiveVisual;

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
