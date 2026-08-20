import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-cpu';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import { logger } from '../../config/logger';

export interface ObjectDetectionBox {
  class: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export class ObjectDetectorModel {
  private static instance: ObjectDetectorModel | null = null;
  private model: cocoSsd.ObjectDetection | null = null;
  private isInitializing: boolean = false;
  private initPromise: Promise<void> | null = null;

  private constructor() {}

  public static getInstance(): ObjectDetectorModel {
    if (!ObjectDetectorModel.instance) {
      ObjectDetectorModel.instance = new ObjectDetectorModel();
    }
    return ObjectDetectorModel.instance;
  }

  public async loadModel(): Promise<void> {
    if (this.model) return;
    if (this.initPromise) return this.initPromise;

    this.isInitializing = true;
    this.initPromise = (async () => {
      try {
        await tf.ready();
        logger.info('[ML] Loading COCO-SSD Model (lite_mobilenet_v2)...');
        this.model = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
        logger.info('[ML] COCO-SSD Model loaded successfully.');
      } catch (err: any) {
        logger.error(`[ML] Failed to load COCO-SSD Model: ${err.message}`);
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

  public async detectObjects(tensor: tf.Tensor3D, originalWidth: number, originalHeight: number): Promise<ObjectDetectionBox[]> {
    if (!this.model) {
      await this.loadModel();
      if (!this.model) return [];
    }

    try {
      const predictions = await this.model.detect(tensor, 10, 0.10);
      if (!predictions || predictions.length === 0) return [];

      const tensorHeight = tensor.shape[0];
      const tensorWidth = tensor.shape[1];
      const scaleX = originalWidth / tensorWidth;
      const scaleY = originalHeight / tensorHeight;

      return predictions.map((pred: cocoSsd.DetectedObject) => {
        const [bx, by, bw, bh] = pred.bbox;
        const x = Math.max(0, Math.round(bx * scaleX));
        const y = Math.max(0, Math.round(by * scaleY));
        const width = Math.min(originalWidth - x, Math.round(bw * scaleX));
        const height = Math.min(originalHeight - y, Math.round(bh * scaleY));
        const confidence = Math.round(pred.score * 100) / 100;

        return {
          class: pred.class,
          confidence,
          x,
          y,
          width,
          height,
        };
      });
    } catch (err: any) {
      logger.error(`[ML] COCO-SSD detection error: ${err.message}`);
      return [];
    }
  }
}
