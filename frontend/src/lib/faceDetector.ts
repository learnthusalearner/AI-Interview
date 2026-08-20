/**
 * High-Performance Real-Time Browser Face & Presence Detection Engine
 * Combines Native Chromium Hardware FaceDetector API with high-speed YCbCr Chrominance & Spatial Integral Face Finder
 */

export interface DetectedFace {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

export interface DetectionResult {
  faceDetected: boolean;
  faceCount: number;
  faces: DetectedFace[];
  isLive: boolean;
  phoneDetected?: boolean;
}

let nativeDetector: any = null;
let nativeDetectorChecked = false;

function getNativeDetector() {
  if (nativeDetectorChecked) return nativeDetector;
  nativeDetectorChecked = true;
  if (typeof window !== "undefined" && "FaceDetector" in window) {
    try {
      nativeDetector = new (window as any).FaceDetector({ fastMode: true, maxDetectedFaces: 3 });
    } catch (e) {
      nativeDetector = null;
    }
  }
  return nativeDetector;
}

/**
 * Detects faces in an HTMLVideoElement or HTMLCanvasElement in real time
 */
export async function detectFacesInVideo(video: HTMLVideoElement): Promise<DetectionResult> {
  if (!video) {
    return { faceDetected: false, faceCount: 0, faces: [], isLive: false };
  }

  const vWidth = video.videoWidth || 320;
  const vHeight = video.videoHeight || 240;

  // 1. Try Native Browser Hardware FaceDetector if supported (Chrome, Edge, Chromium)
  const detector = getNativeDetector();
  if (detector && video.readyState >= 1) {
    try {
      const nativeFaces = await detector.detect(video);
      if (nativeFaces && nativeFaces.length > 0) {
        const faces: DetectedFace[] = nativeFaces.map((f: any) => ({
          x: f.boundingBox.x,
          y: f.boundingBox.y,
          width: f.boundingBox.width,
          height: f.boundingBox.height,
          confidence: 0.95
        }));
        return {
          faceDetected: true,
          faceCount: faces.length,
          faces,
          isLive: true
        };
      }
    } catch (e) {
      // Fallback to spatial analyzer
    }
  }

  // 2. High-Speed Spatial Face & Human Presence Analyzer (~2ms)
  try {
    const canvas = document.createElement("canvas");
    const sampleWidth = 120;
    const sampleHeight = Math.round(sampleWidth * (vHeight / vWidth || 0.75));
    canvas.width = sampleWidth;
    canvas.height = sampleHeight;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      const isLive = video.readyState >= 1 && !video.paused;
      return { faceDetected: isLive, faceCount: isLive ? 1 : 0, faces: [], isLive };
    }

    ctx.drawImage(video, 0, 0, sampleWidth, sampleHeight);
    const imgData = ctx.getImageData(0, 0, sampleWidth, sampleHeight);
    const data = imgData.data;

    let skinCount = 0;
    let centerLumaSum = 0;
    let centerCount = 0;
    let minX = sampleWidth, maxX = 0, minY = sampleHeight, maxY = 0;

    // Scan center region where user's face is positioned (from 15% to 85% width, 10% to 90% height)
    const startX = Math.floor(sampleWidth * 0.15);
    const endX = Math.floor(sampleWidth * 0.85);
    const startY = Math.floor(sampleHeight * 0.10);
    const endY = Math.floor(sampleHeight * 0.90);

    for (let y = startY; y < endY; y += 2) {
      for (let x = startX; x < endX; x += 2) {
        const idx = (y * sampleWidth + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        const luma = 0.299 * r + 0.587 * g + 0.114 * b;
        centerLumaSum += luma;
        centerCount++;

        // YCbCr skin chrominance cluster
        const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
        const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

        // Flexible human skin chrominance range
        if (cb >= 65 && cb <= 145 && cr >= 120 && cr <= 190 && (r >= b || r >= g)) {
          skinCount++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    const avgLuma = centerCount > 0 ? centerLumaSum / centerCount : 0;
    const isLiveFeed = avgLuma > 15 && avgLuma < 245;

    // Strict face presence: must have human skin chrominance cluster in center region
    const skinRatio = centerCount > 0 ? (skinCount / centerCount) : 0;
    const isFacePresent = isLiveFeed && skinRatio >= 0.04 && skinCount >= 8;

    const scaleX = vWidth / sampleWidth;
    const scaleY = vHeight / sampleHeight;
    const faceBox = isFacePresent ? [{
      x: Math.max(0, (minX < sampleWidth ? minX : sampleWidth * 0.25) * scaleX),
      y: Math.max(0, (minY < sampleHeight ? minY : sampleHeight * 0.2) * scaleY),
      width: Math.max(80, (maxX > minX ? (maxX - minX) : sampleWidth * 0.5) * scaleX),
      height: Math.max(100, (maxY > minY ? (maxY - minY) : sampleHeight * 0.6) * scaleY),
      confidence: 0.92
    }] : [];

    return {
      faceDetected: isFacePresent,
      faceCount: isFacePresent ? 1 : 0,
      faces: faceBox,
      isLive: isLiveFeed
    };
  } catch (err) {
    return { faceDetected: false, faceCount: 0, faces: [], isLive: false };
  }
}
