import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-cpu';
import * as blazeface from '@tensorflow-models/blazeface';
import { logger } from '../../config/logger';

export interface FaceDetectionBox {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

export class FaceDetectorModel {
  private static instance: FaceDetectorModel | null = null;
  private model: blazeface.BlazeFaceModel | null = null;
  private isInitializing: boolean = false;
  private initPromise: Promise<void> | null = null;

  private constructor() {}

  public static getInstance(): FaceDetectorModel {
    if (!FaceDetectorModel.instance) {
      FaceDetectorModel.instance = new FaceDetectorModel();
    }
    return FaceDetectorModel.instance;
  }

  public async loadModel(): Promise<void> {
    if (this.model) return;
    if (this.initPromise) return this.initPromise;

    this.isInitializing = true;
    this.initPromise = (async () => {
      try {
        await tf.ready();
        logger.info('[ML] Loading BlazeFace Model...');
        this.model = await blazeface.load({ scoreThreshold: 0.3 });
        logger.info('[ML] BlazeFace Model loaded successfully.');
      } catch (err: any) {
        logger.error(`[ML] Failed to load BlazeFace Model: ${err.message}`);
        this.model = null;
        throw err;
      } finally {
        this.isInitializing = false;
      }
    })();

    return this.initPromise;
  }

  public isLoaded(): boolean {
    return this.model !== null;
  }

  public async detectFaces(tensor: tf.Tensor3D, originalWidth: number, originalHeight: number): Promise<FaceDetectionBox[]> {
    if (!this.model) {
      await this.loadModel();
      if (!this.model) return [];
    }

    try {
      const predictions = await this.model.estimateFaces(tensor, false);
      if (!predictions || predictions.length === 0) return [];

      const tensorHeight = tensor.shape[0];
      const tensorWidth = tensor.shape[1];
      const scaleX = originalWidth / tensorWidth;
      const scaleY = originalHeight / tensorHeight;

      return predictions.map((pred: any) => {
        const topLeft = Array.isArray(pred.topLeft) ? pred.topLeft : [0, 0];
        const bottomRight = Array.isArray(pred.bottomRight) ? pred.bottomRight : [0, 0];
        const prob = Array.isArray(pred.probability) ? pred.probability[0] : (pred.probability || 0.9);

        const x = Math.max(0, Math.round(topLeft[0] * scaleX));
        const y = Math.max(0, Math.round(topLeft[1] * scaleY));
        const width = Math.min(originalWidth - x, Math.round((bottomRight[0] - topLeft[0]) * scaleX));
        const height = Math.min(originalHeight - y, Math.round((bottomRight[1] - topLeft[1]) * scaleY));
        const confidence = Math.round(prob * 100) / 100;

        return { x, y, width, height, confidence };
      });
    } catch (err: any) {
      logger.error(`[ML] BlazeFace detection error: ${err.message}`);
      return [];
    }
  }
}
