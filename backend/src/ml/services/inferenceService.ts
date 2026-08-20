import { FaceDetectorModel, FaceDetectionBox } from '../models/faceDetector';
import { ObjectDetectorModel, ObjectDetectionBox } from '../models/objectDetector';
import { processBase64Frame, decodeImageBuffer } from '../utils/imageUtils';
import { logger } from '../../config/logger';

export interface DetectionResultResponse {
  success: boolean;
  timestamp: number;
  processingTimeMs: number;
  faces: FaceDetectionBox[];
  objects: ObjectDetectionBox[];
  error?: string;
  decodeTimeMs?: number;
  faceInferenceTimeMs?: number;
  objectInferenceTimeMs?: number;
}

export class InferenceService {
  private static instance: InferenceService | null = null;
  private faceDetector: FaceDetectorModel;
  private objectDetector: ObjectDetectorModel;
  private activeJobs: number = 0;
  private isObjectInferenceRunning: boolean = false;
  private cachedObjects: ObjectDetectionBox[] = [];
  private readonly MAX_CONCURRENT_INFERENCES = 3;

  private constructor() {
    this.faceDetector = FaceDetectorModel.getInstance();
    this.objectDetector = ObjectDetectorModel.getInstance();
  }

  public static getInstance(): InferenceService {
    if (!InferenceService.instance) {
      InferenceService.instance = new InferenceService();
    }
    return InferenceService.instance;
  }

  public async initialize(): Promise<void> {
    logger.info('[ML] Initializing Server-Side Vision Models...');
    try {
      await Promise.all([
        this.faceDetector.loadModel(),
        this.objectDetector.loadModel(),
      ]);
      logger.info('[ML] All ML Vision Models initialized and ready for inference.');
    } catch (err: any) {
      logger.error(`[ML] Model initialization failed: ${err.message}`);
    }
  }

  public getHealth(): { status: 'ready' | 'initializing'; faceModel: boolean; objectModel: boolean } {
    const faceModel = this.faceDetector.isLoaded();
    const objectModel = this.objectDetector.isLoaded();
    return {
      status: faceModel && objectModel ? 'ready' : 'initializing',
      faceModel,
      objectModel,
    };
  }

  private async triggerBackgroundObjectScan(base64Image: string): Promise<void> {
    if (this.isObjectInferenceRunning || !this.objectDetector.isLoaded()) return;
    this.isObjectInferenceRunning = true;

    let processed: ReturnType<typeof processBase64Frame> | null = null;
    try {
      processed = processBase64Frame(base64Image, 320);
      const objects = await this.objectDetector.detectObjects(
        processed.tensor,
        processed.originalWidth,
        processed.originalHeight
      );
      this.cachedObjects = objects;
    } catch (err) {
      // Non-blocking background worker
    } finally {
      this.isObjectInferenceRunning = false;
      if (processed && processed.tensor) {
        processed.tensor.dispose();
      }
    }
  }

  public async runDetection(
    imageInput: string | Buffer,
    options?: { runFace?: boolean; runObject?: boolean }
  ): Promise<DetectionResultResponse> {
    const timestamp = Date.now();
    const startTime = Date.now();

    // 1. Stale-frame / Concurrency Guard
    if (this.activeJobs >= this.MAX_CONCURRENT_INFERENCES) {
      return {
        success: true,
        timestamp,
        processingTimeMs: 0,
        faces: [],
        objects: this.cachedObjects,
        error: 'Frame dropped due to server inference load',
      };
    }

    this.activeJobs++;

    let processed: ReturnType<typeof processBase64Frame> | null = null;
    let faces: FaceDetectionBox[] = [];
    let objects: ObjectDetectionBox[] = [];

    let decodeTimeMs = 0;
    let faceInferenceTimeMs = 0;
    let objectInferenceTimeMs = 0;

    try {
      // 2. Decode and Preprocess Image (320px for high-definition face and phone detection)
      const decodeStart = Date.now();
      if (Buffer.isBuffer(imageInput)) {
        processed = decodeImageBuffer(imageInput, 320);
      } else {
        processed = processBase64Frame(imageInput, 320);
      }
      decodeTimeMs = Date.now() - decodeStart;

      const { tensor, originalWidth, originalHeight } = processed;

      // 3. Run Face Detection conditionally (defaults to true)
      if (options?.runFace !== false) {
        const faceStart = Date.now();
        try {
          faces = await this.faceDetector.detectFaces(tensor, originalWidth, originalHeight);
        } catch (faceErr: any) {
          logger.error(`[ML] Face detector error: ${faceErr.message}`);
        }
        faceInferenceTimeMs = Date.now() - faceStart;
      }

      // 4. Run Object Detection conditionally (defaults to true)
      if (options?.runObject !== false) {
        const objectStart = Date.now();
        try {
          if (this.objectDetector.isLoaded()) {
            objects = await this.objectDetector.detectObjects(tensor, originalWidth, originalHeight);
            this.cachedObjects = objects;
          } else {
            objects = this.cachedObjects;
          }
        } catch (objErr: any) {
          logger.error(`[ML] Object detector error: ${objErr.message}`);
          objects = this.cachedObjects;
        }
        objectInferenceTimeMs = Date.now() - objectStart;
      } else {
        objects = this.cachedObjects;
      }

      const processingTimeMs = Date.now() - startTime;

      return {
        success: true,
        timestamp,
        processingTimeMs,
        faces,
        objects,
        decodeTimeMs,
        faceInferenceTimeMs,
        objectInferenceTimeMs,
      };
    } catch (err: any) {
      logger.error(`[ML] Inference failure: ${err.message}`);
      return {
        success: false,
        timestamp,
        processingTimeMs: Date.now() - startTime,
        faces: [],
        objects: this.cachedObjects,
        error: err.message,
      };
    } finally {
      this.activeJobs = Math.max(0, this.activeJobs - 1);
      if (processed && processed.tensor) {
        processed.tensor.dispose();
      }
    }
  }
}

export const inferenceService = InferenceService.getInstance();
