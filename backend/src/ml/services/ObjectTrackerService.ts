import { prisma } from '../../config/prisma';
import { logger } from '../../config/logger';

export interface BBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RiskConfig {
  risk: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
  score: number;
  requiresConfirmation: boolean;
}

export const OBJECT_RISK_CONFIG: Record<string, RiskConfig> = {
  "cell phone": { risk: "HIGH", score: 100, requiresConfirmation: true },
  "phone": { risk: "HIGH", score: 100, requiresConfirmation: true },
  "tablet": { risk: "HIGH", score: 90, requiresConfirmation: true },
  "laptop": { risk: "HIGH", score: 90, requiresConfirmation: true },
  "book": { risk: "MEDIUM", score: 50, requiresConfirmation: true },
  "remote": { risk: "MEDIUM", score: 40, requiresConfirmation: true }
};

export const DETECTION_THRESHOLDS = {
  highRisk: 0.20,   // Was 0.35 — lowered to catch phones at challenging angles/partial occlusion
  mediumRisk: 0.30, // Was 0.45 — lowered to catch books/remotes more reliably
  lowRisk: 0.40     // Was 0.55 — informational objects (chairs, bottles)
};

export const CONFIRMATION_FRAMES = 3;
export const MAX_LOST_FRAMES = 5; // Temporal smoothing: keep track alive for 5 frames to prevent flickering

export interface TrackedObject {
  trackId: string;
  class: string;
  bbox: BBox;
  confidence: number;
  risk: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
  score: number;
  state: 'CANDIDATE' | 'CONFIRMED' | 'FLAGGED' | 'CLEARED';
  consecutiveFrames: number;
  framesSinceLastSeen: number;
}

export function getIoU(boxA: BBox, boxB: BBox): number {
  const xA = Math.max(boxA.x, boxB.x);
  const yA = Math.max(boxA.y, boxB.y);
  const xB = Math.min(boxA.x + boxA.width, boxB.x + boxB.width);
  const yB = Math.min(boxA.y + boxA.height, boxB.y + boxB.height);

  const interWidth = Math.max(0, xB - xA);
  const interHeight = Math.max(0, yB - yA);
  const interArea = interWidth * interHeight;

  const boxAArea = boxA.width * boxA.height;
  const boxBArea = boxB.width * boxB.height;

  const unionArea = boxAArea + boxBArea - interArea;
  if (unionArea === 0) return 0;

  return interArea / unionArea;
}

export class SessionObjectTracker {
  private sessionId: string;
  private trackedObjects: TrackedObject[] = [];
  private trackCounters: Record<string, number> = {};

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  public async processFrameDetections(
    rawDetections: Array<{ class: string; confidence: number; x: number; y: number; width: number; height: number }>
  ): Promise<TrackedObject[]> {
    // 1. Filter and classify raw detections
    const detections = rawDetections.map(det => {
      const className = det.class.toLowerCase();
      const riskInfo = OBJECT_RISK_CONFIG[className];
      
      if (riskInfo) {
        let threshold = DETECTION_THRESHOLDS.lowRisk;
        if (riskInfo.risk === 'HIGH') threshold = DETECTION_THRESHOLDS.highRisk;
        else if (riskInfo.risk === 'MEDIUM') threshold = DETECTION_THRESHOLDS.mediumRisk;

        return {
          originalClass: det.class,
          class: className,
          confidence: det.confidence,
          bbox: { x: det.x, y: det.y, width: det.width, height: det.height },
          risk: riskInfo.risk,
          score: riskInfo.score,
          threshold
        };
      } else {
        // Unknown or Low/Informational object
        const isInformational = ["person", "chair", "bottle", "cup", "keyboard", "mouse"].includes(className);
        return {
          originalClass: det.class,
          class: isInformational ? className : "unknown_object",
          confidence: det.confidence,
          bbox: { x: det.x, y: det.y, width: det.width, height: det.height },
          risk: (isInformational ? 'LOW' : 'UNKNOWN') as 'LOW' | 'UNKNOWN',
          score: 0,
          threshold: DETECTION_THRESHOLDS.lowRisk
        };
      }
    }).filter(d => d.confidence >= d.threshold);

    const matchedDetectionsIndices = new Set<number>();
    
    // 2. Match with existing tracks using IoU
    for (const track of this.trackedObjects) {
      let bestMatchIdx = -1;
      let bestIoU = 0.30; // Min overlap required for matching

      for (let i = 0; i < detections.length; i++) {
        if (matchedDetectionsIndices.has(i)) continue;
        if (detections[i].class !== track.class) continue;

        const iou = getIoU(track.bbox, detections[i].bbox);
        if (iou > bestIoU) {
          bestIoU = iou;
          bestMatchIdx = i;
        }
      }

      if (bestMatchIdx !== -1) {
        matchedDetectionsIndices.add(bestMatchIdx);
        const match = detections[bestMatchIdx];
        
        track.bbox = match.bbox;
        track.confidence = match.confidence;
        track.framesSinceLastSeen = 0;
        track.consecutiveFrames++;

        logger.debug(`[OBJECT] Matched track ${track.trackId} (consecutive: ${track.consecutiveFrames})`);

        if (track.state === 'CANDIDATE' && track.consecutiveFrames >= CONFIRMATION_FRAMES) {
          track.state = 'CONFIRMED';
          logger.info(`[OBJECT] Track ${track.trackId} has been CONFIRMED.`);

          if (track.risk === 'HIGH' || track.risk === 'MEDIUM') {
            track.state = 'FLAGGED';
            await this.triggerCheatingViolation(track);
          }
        }
      } else {
        // Increment missed count for lost tracks
        track.framesSinceLastSeen++;
      }
    }

    // 3. Create new tracks for unmatched detections
    for (let i = 0; i < detections.length; i++) {
      if (matchedDetectionsIndices.has(i)) continue;
      const det = detections[i];

      const cat = det.class.replace(/\s+/g, '_');
      this.trackCounters[cat] = (this.trackCounters[cat] || 0) + 1;
      const trackId = `${cat}-${String(this.trackCounters[cat]).padStart(3, '0')}`;

      const newTrack: TrackedObject = {
        trackId,
        class: det.class,
        bbox: det.bbox,
        confidence: det.confidence,
        risk: det.risk,
        score: det.score,
        state: 'CANDIDATE',
        consecutiveFrames: 1,
        framesSinceLastSeen: 0
      };

      logger.info(`[OBJECT] Created new candidate track: ${trackId}`);
      this.trackedObjects.push(newTrack);
    }

    // 4. Cleanup old/cleared tracks
    this.trackedObjects = this.trackedObjects.filter(track => {
      if (track.framesSinceLastSeen > MAX_LOST_FRAMES) {
        logger.info(`[OBJECT] Track ${track.trackId} cleared due to inactivity.`);
        return false;
      }
      return true;
    });

    return this.trackedObjects;
  }

  private async triggerCheatingViolation(track: TrackedObject) {
    try {
      logger.info(`[FLAG] session=${this.sessionId} type=UNAUTHORIZED_DEVICE object=${track.class} confidence=${track.confidence} trackId=${track.trackId}`);

      if (this.sessionId.startsWith("temp-")) {
        logger.info(`[FLAG] Skipping DB persistence for temporary pre-interview session ${this.sessionId}`);
        return;
      }

      // 1. Map category to appropriate structured type
      let violationType = "SUSPICIOUS_OBJECT";
      let points = 1;
      if (["cell phone", "phone", "tablet", "laptop"].includes(track.class) || track.risk === 'HIGH') {
        violationType = "UNAUTHORIZED_DEVICE";
        points = 2; // +2 points for mobile phone / unauthorized device
      }

      // 2. Save structured event to database
      const dbEvent = await prisma.detectionEvent.create({
        data: {
          interviewSessionId: this.sessionId,
          eventType: violationType,
          objectClass: track.class,
          confidence: track.confidence,
          riskLevel: track.risk
        }
      });

      // 3. Atomically increment session flag count in DB by points (+2 for phone)
      await prisma.interviewSession.update({
        where: { id: this.sessionId },
        data: {
          cheatCount: {
            increment: points
          }
        }
      });

      logger.info(`[FLAG] Successfully committed structured event ${dbEvent.id} and incremented cheatCount in DB.`);
    } catch (err: any) {
      logger.error(`[FLAG] Failed to trigger cheating violation for track ${track.trackId}: ${err.message}`);
    }
  }
}

export class ObjectTrackerService {
  private static trackers: Record<string, SessionObjectTracker> = {};

  public static getTracker(sessionId: string): SessionObjectTracker {
    if (!ObjectTrackerService.trackers[sessionId]) {
      ObjectTrackerService.trackers[sessionId] = new SessionObjectTracker(sessionId);
    }
    return ObjectTrackerService.trackers[sessionId];
  }

  public static removeTracker(sessionId: string): void {
    if (ObjectTrackerService.trackers[sessionId]) {
      delete ObjectTrackerService.trackers[sessionId];
      logger.info(`[OBJECT] Cleaned up tracker for session ${sessionId}`);
    }
  }
}
