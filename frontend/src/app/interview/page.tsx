"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Square, Loader2, ArrowRight } from "lucide-react";
import { useInterviewStore } from "@/lib/store";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { transcribeAudioAPI, respondInterviewAPI, evaluateInterviewAPI, submitFeedbackAPI, updateApplicationStatusAPI, startInterviewAPI, sendProctoringFrameAPI, detectMLFrameAPI } from "@/services/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Copy, Check, MessageSquareHeart, Camera, CameraOff, ScanFace } from "lucide-react";
import { useUser } from "@clerk/nextjs";

import { detectFacesInVideo } from "@/lib/faceDetector";

import { io, Socket } from "socket.io-client";

// Temporal State Machine Configurations
const FACE_CONFIRM_FRAMES = 2;
const FACE_LOST_FRAMES = 3;
const OBJECT_CONFIRM_FRAMES = 2;
const OBJECT_CLEAR_FRAMES = 4;

export default function InterviewPage() {
  const router = useRouter();
  const { user } = useUser();
  const { sessionId, setSessionId, messages, addMessage, setEvaluation } = useInterviewStore();
  const { isRecording, startRecording, stopRecording } = useAudioRecorder();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isBootingRef = useRef(false);
  const [isVideoActive, setIsVideoActive] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [sessionFailed, setSessionFailed] = useState(false);
  const sessionIdRef = useRef<string | null>(null);
  
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);
  const engagementStats = useRef({ totalFrames: 0, faceDetectedFrames: 0 });
  const [violationCount, setViolationCount] = useState(0);
  const violationCountRef = useRef(0);
  
  // --- TEMPORAL STATE MACHINE: FACE PRESENCE ---
  const [faceState, setFaceState] = useState<'PRESENT' | 'ABSENCE_CANDIDATE' | 'ABSENT'>('ABSENT');
  const consecutivePositiveFaces = useRef(0);
  const consecutiveMissedFaces = useRef(0);
  const [faceConfidence, setFaceConfidence] = useState(0);
  const [detectedFaceCount, setDetectedFaceCount] = useState(0);

  // --- ABSENCE TIMER (STRICT 3.0s RULE) ---
  const absenceTimerRef = useRef(0);
  const [absenceTimerDisplay, setAbsenceTimerDisplay] = useState(0);
  const lastAbsenceTick = useRef(Date.now());

  // --- LOW CONFIDENCE FACE FLAGGING (<35%) ---
  const consecutiveLowConfFaceFrames = useRef(0);
  const LOW_CONF_FACE_THRESHOLD = 0.35;
  const LOW_CONF_FACE_FRAMES = 5; // Must be low-confidence for 5 consecutive frames to flag

  // --- TEMPORAL STATE MACHINE: UNAUTHORIZED OBJECTS ---
  const [objectState, setObjectState] = useState<'NOT_DETECTED' | 'CANDIDATE' | 'CONFIRMED' | 'VIOLATION_REPORTED'>('NOT_DETECTED');
  const objectStateRef = useRef<'NOT_DETECTED' | 'CANDIDATE' | 'CONFIRMED' | 'VIOLATION_REPORTED'>('NOT_DETECTED');
  const consecutiveObjectFrames = useRef(0);
  const consecutiveClearObjectFrames = useRef(0);
  const [detectedObjectsList, setDetectedObjectsList] = useState<Array<{ class: string; confidence: number }>>([]);

  // --- PIPELINE & DEBUG HUD METRICS ---
  const [inferenceLatency, setInferenceLatency] = useState(0);
  const [videoDimensions, setVideoDimensions] = useState({ width: 0, height: 0 });
  const [inferenceFps, setInferenceFps] = useState(0);
  const [socketStatus, setSocketStatus] = useState<'CONNECTED' | 'DISCONNECTED'>('DISCONNECTED');
  const [showDebugPanel, setShowDebugPanel] = useState(true);
  const lastInferenceCount = useRef(0);
  const lastFpsTimestamp = useRef(Date.now());

  // --- DETAILED PROFILE METRICS ---
  const [encodeTime, setEncodeTime] = useState(0);
  const [networkTime, setNetworkTime] = useState(0);
  const [decodeTime, setDecodeTime] = useState(0);
  const [faceInferenceTime, setFaceInferenceTime] = useState(0);
  const [objectInferenceTime, setObjectInferenceTime] = useState(0);
  const [totalEndToEndTime, setTotalEndToEndTime] = useState(0);
  const [pendingFramesCount, setPendingFramesCount] = useState(0);
  const [droppedFramesCount, setDroppedFramesCount] = useState(0);
  const [cameraFps, setCameraFps] = useState(30);
  const [memoryUsage, setMemoryUsage] = useState(0);

  // --- LATEST-FRAME-ONLY BUFFER & CONCURRENCY CONTROL ---
  const frameCounter = useRef(0);
  const lastProcessedFrameId = useRef(0);
  const latestPendingFrame = useRef<{
    arrayBuffer: ArrayBuffer;
    frameId: number;
    timestamp: number;
    captureTime: number;
    resizeTime: number;
    encodeTime: number;
    runFace: boolean;
    runObject: boolean;
  } | null>(null);
  const droppedFramesCounter = useRef(0);

  const canvasOverlayRef = useRef<HTMLCanvasElement | null>(null);
  const isInferenceInFlight = useRef(false);
  const socketRef = useRef<Socket | null>(null);
  
  const cheatFlags = useRef<string[]>([]);
  const poppedToastTracks = useRef<Set<string>>(new Set());
  
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [loadingText, setLoadingText] = useState("We are about to start...");
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const isSetupCompleteRef = useRef(false);
  const [isStartingInterview, setIsStartingInterview] = useState(false);

  useEffect(() => {
    isSetupCompleteRef.current = isSetupComplete;
  }, [isSetupComplete]);

  useEffect(() => {
    if (sessionId && messages.length > 0) {
      setIsSetupComplete(true);
    }
  }, [sessionId, messages]);

  const triggerViolation = (type: string, message: string, points: number = 1) => {
    cheatFlags.current.push(type);

    // Always increment locally by points (+2 for phone, +1 for face absence) for instant UI feedback
    violationCountRef.current += points;
    setViolationCount(violationCountRef.current);
    
    // Also persist to DB if we have an active session
    const socket = socketRef.current;
    const activeSessionId = sessionId || sessionIdRef.current;
    if (socket && socket.connected && activeSessionId) {
      socket.emit('trigger_violation', {
        sessionId: activeSessionId,
        type,
        message,
        points
      });
    }
    
    toast.error(`⚠ MISCONDUCT DETECTED (+${points} pts)`, {
      description: message,
      duration: 6000,
    });
  };

  // Instant Video Stream Attacher (never lets the video drop on unmount/re-render)
  const attachVideoRef = (node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node && streamRef.current) {
      if (node.srcObject !== streamRef.current) {
        node.srcObject = streamRef.current;
      }
      node.onloadedmetadata = () => {
        setVideoDimensions({ width: node.videoWidth, height: node.videoHeight });
        node.play().catch(e => console.warn("Video play error:", e));
      };
      node.play().catch(e => console.warn("Video play error:", e));
    }
  };

  // Dedicated Camera Lifecycle with React StrictMode resilience
  useEffect(() => {
    let unmounted = false;

    const startCamera = async () => {
      try {
        console.log("[CAMERA] Requesting user media (video + audio)...");
        let stream: MediaStream;
        
        try {
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" }, 
            audio: true 
          });
        } catch (mediaErr) {
          console.warn("[CAMERA] Combined request failed, falling back to video only:", mediaErr);
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" }, 
            audio: false 
          });
        }
        
        if (unmounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        streamRef.current = stream;

        const hasVideo = stream.getVideoTracks().some(t => t.readyState === 'live' && t.enabled);
        const hasAudio = stream.getAudioTracks().some(t => t.readyState === 'live' && t.enabled);

        console.log("[CAMERA] Camera ready. Active tracks:", { video: hasVideo, audio: hasAudio });
        setIsVideoActive(hasVideo);
        setIsMicActive(hasAudio || true);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.muted = true;
          videoRef.current.playsInline = true;
          videoRef.current.onloadedmetadata = () => {
            if (videoRef.current) {
              setVideoDimensions({ width: videoRef.current.videoWidth, height: videoRef.current.videoHeight });
            }
            videoRef.current?.play().catch(e => console.warn("Video play error:", e));
          };
          videoRef.current.play().catch(e => console.warn("Video play error:", e));
        }
      } catch (err: any) {
        console.error("[CAMERA] Access denied or error:", err);
        toast.error("Camera Permissions Required", {
          description: "Please allow camera and microphone access in your browser."
        });
      } finally {
        setIsCameraReady(true);
      }
    };

    startCamera();

    return () => {
      unmounted = true;
      console.log("[CAMERA] Cleaning up camera tracks on unmount.");
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const requestCameraAccess = async () => {
    try {
      console.log("[CAMERA] Manual camera request triggered...");
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" }, 
          audio: true 
        });
      } catch (mediaErr) {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" }, 
          audio: false 
        });
      }
      
      streamRef.current = stream;
      const hasVideo = stream.getVideoTracks().some(t => t.readyState === 'live' && t.enabled);
      const hasAudio = stream.getAudioTracks().some(t => t.readyState === 'live' && t.enabled);

      setIsVideoActive(hasVideo);
      setIsMicActive(hasAudio || true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.playsInline = true;
        videoRef.current.play().catch(e => console.warn(e));
        setVideoDimensions({ width: videoRef.current.videoWidth || 640, height: videoRef.current.videoHeight || 480 });
      }
      toast.success("Camera & Microphone Connected!");
    } catch (err: any) {
      console.error("[CAMERA] Manual request failed:", err);
      toast.error("Camera Permission Required", {
        description: "Please click the camera lock icon in your browser address bar to allow permissions."
      });
    }
  };

  // Re-verify stream attachment whenever switching view mode
  useEffect(() => {
    if (videoRef.current && streamRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
      }
      videoRef.current.play().catch(e => console.warn(e));
    }
  }, [isSetupComplete]);

  // Central Processing Function for ML Results (WebSocket + HTTP Fallback)
  const processDetectionResults = (mlResult: any) => {
    const clientReceiveTime = Date.now();
    if (!mlResult || !mlResult.success) {
      isInferenceInFlight.current = false;
      return;
    }

    const meta = mlResult.metadata || {};
    
    // Stale Frame Protection
    if (meta.frameId && meta.frameId <= lastProcessedFrameId.current) {
      console.warn(`[ML] Discarded stale frame: ${meta.frameId} (current: ${lastProcessedFrameId.current})`);
      return;
    }
    if (meta.frameId) {
      lastProcessedFrameId.current = meta.frameId;
    }

    // Memory usage tracker (Chrome/Edge compatible)
    if (typeof window !== 'undefined' && (performance as any).memory) {
      setMemoryUsage(Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024));
    }

    // Capture, resize and encode latency from metadata
    const capture = Math.round(meta.captureTime || 0);
    const resize = Math.round(meta.resizeTime || 0);
    const encoding = Math.round(meta.encodeTime || 0);

    // WebSocket Transmission time (client to server)
    const webSocketTrans = Math.round(Math.max(0, mlResult.timestamp - meta.timestamp));

    // Decode and Inference timings on backend
    const decode = Math.round(mlResult.decodeTimeMs || 0);
    const faceModel = Math.round(mlResult.faceInferenceTimeMs || 0);
    const objectModel = Math.round(mlResult.objectInferenceTimeMs || 0);
    const processing = Math.round(mlResult.processingTimeMs || 0);

    // Response Transmission time (server to client)
    const serverSendTime = mlResult.timestamp + processing;
    const responseTrans = Math.round(Math.max(0, clientReceiveTime - serverSendTime));
    const total = Math.round(clientReceiveTime - meta.timestamp);

    // Update States for Debug/Performance Dashboard
    setEncodeTime(encoding);
    setNetworkTime(webSocketTrans + responseTrans);
    setDecodeTime(decode);
    setFaceInferenceTime(faceModel);
    setObjectInferenceTime(objectModel);
    setTotalEndToEndTime(total);
    setInferenceLatency(processing);

    lastInferenceCount.current += 1;

    // FPS Meter
    const now = Date.now();
    if (now - lastFpsTimestamp.current >= 1000) {
      setInferenceFps(lastInferenceCount.current);
      lastInferenceCount.current = 0;
      lastFpsTimestamp.current = now;
    }

    // Print Profile Log as requested
    console.log(`Frame ID: ${meta.frameId}\n\nCapture:        ${capture} ms\nResize:         ${resize} ms\nEncoding:       ${encoding} ms\nWebSocket:      ${webSocketTrans} ms\nDecode:         ${decode} ms\nFace model:     ${faceModel} ms\nObject model:   ${objectModel} ms\nProcessing:     ${processing} ms\nResponse:       ${responseTrans} ms\n\nTOTAL:          ${total} ms`);

    // Sync violation count from DB — only update UPWARD to avoid overwriting
    // optimistic local increments from face absence / frontend triggers
    if (mlResult.cheatCount !== undefined && mlResult.cheatCount !== null) {
      if (mlResult.cheatCount > violationCountRef.current) {
        violationCountRef.current = mlResult.cheatCount;
        setViolationCount(mlResult.cheatCount);
      }
    }

    const rawFaces = mlResult.faces || [];
    const rawObjects = mlResult.objects || [];

    setDetectedFaceCount(rawFaces.length);
    setDetectedObjectsList(rawObjects);

    if (rawFaces.length > 0) {
      setFaceConfidence(rawFaces[0].confidence || 0.95);
    } else {
      setFaceConfidence(0);
    }

    if (videoRef.current) {
      drawBoundingBoxes(rawFaces, rawObjects, videoRef.current.videoWidth, videoRef.current.videoHeight);
    }

    // --- 1. TEMPORAL STATE MACHINE: FACE PRESENCE ---
    const currentFaceConf = rawFaces.length > 0 ? (rawFaces[0].confidence || 0) : 0;

    if (rawFaces.length > 0) {
      consecutivePositiveFaces.current += 1;
      consecutiveMissedFaces.current = 0;

      if (consecutivePositiveFaces.current >= FACE_CONFIRM_FRAMES) {
        setFaceState('PRESENT');
        setFaceDetected(true);
        absenceTimerRef.current = 0;
        setAbsenceTimerDisplay(0);
        engagementStats.current.faceDetectedFrames += 1;
      }

      // --- 1b. LOW CONFIDENCE FACE: flag if face is detected but confidence < 35% ---
      // This catches partially obscured faces, face covered with hand, etc.
      if (currentFaceConf > 0 && currentFaceConf < LOW_CONF_FACE_THRESHOLD) {
        consecutiveLowConfFaceFrames.current += 1;
        if (consecutiveLowConfFaceFrames.current >= LOW_CONF_FACE_FRAMES && isSetupCompleteRef.current) {
          consecutiveLowConfFaceFrames.current = 0; // reset to prevent repeat spam
          triggerViolation(
            'LOW_CONFIDENCE_FACE',
            `Low face confidence detected (${Math.round(currentFaceConf * 100)}%) — possible obstruction or face covering.`
          );
        }
      } else {
        consecutiveLowConfFaceFrames.current = 0;
      }
    } else {
      consecutiveMissedFaces.current += 1;
      consecutivePositiveFaces.current = 0;
      consecutiveLowConfFaceFrames.current = 0;

      if (consecutiveMissedFaces.current >= FACE_LOST_FRAMES) {
        setFaceState('ABSENT');
        setFaceDetected(false);

        if (isSetupCompleteRef.current) {
          const elapsed = (Date.now() - lastAbsenceTick.current) / 1000;
          const clamped = Math.min(0.4, Math.max(0.15, elapsed));
          absenceTimerRef.current += clamped;
          const currentAbsence = Math.round(absenceTimerRef.current * 10) / 10;
          setAbsenceTimerDisplay(currentAbsence);

          if (currentAbsence >= 1.0) {
            triggerViolation('ABSENT_USER', `Candidate out of camera frame (${currentAbsence.toFixed(1)}s)!`, 1);
            absenceTimerRef.current = 0;
            setAbsenceTimerDisplay(0);
          }
        }
      } else {
        setFaceState('ABSENCE_CANDIDATE');
      }
    }
    lastAbsenceTick.current = Date.now();
    engagementStats.current.totalFrames += 1;

    // --- 2. TEMPORAL STATE MACHINE: UNAUTHORIZED OBJECTS (Backend-Driven Confirmation & Alerts) ---
    let hasAnyFlaggedObj = false;
    let hasAnyCandidateObj = false;

    rawObjects.forEach((obj: any) => {
      if (obj.state === 'FLAGGED') {
        hasAnyFlaggedObj = true;
        if (!poppedToastTracks.current.has(obj.trackId)) {
          poppedToastTracks.current.add(obj.trackId);
          setObjectState('VIOLATION_REPORTED');
          objectStateRef.current = 'VIOLATION_REPORTED';

          // triggerViolation increments the local count immediately AND
          // the backend also atomically increments cheatCount in DB (via ObjectTrackerService).
          // The DB count syncs back via ml_result.cheatCount (upward-only sync).
          triggerViolation(
            obj.risk === 'HIGH' ? 'UNAUTHORIZED_DEVICE' : 'SUSPICIOUS_OBJECT',
            `Unauthorized device (${obj.class.toUpperCase()}) detected — confidence ${Math.round(obj.confidence * 100)}%`,
            2
          );
        }
      } else if (obj.state === 'CLEARED') {
        poppedToastTracks.current.delete(obj.trackId);
      } else if (obj.state === 'CANDIDATE') {
        hasAnyCandidateObj = true;
      }
    });

    if (hasAnyFlaggedObj) {
      setObjectState('VIOLATION_REPORTED');
      objectStateRef.current = 'VIOLATION_REPORTED';
    } else if (hasAnyCandidateObj) {
      setObjectState('CANDIDATE');
      objectStateRef.current = 'CANDIDATE';
    } else if (rawObjects.length === 0) {
      setObjectState('NOT_DETECTED');
      objectStateRef.current = 'NOT_DETECTED';
    }

    // Process pending frame in the single-flight buffer (MAX_PENDING_FRAMES = 1)
    isInferenceInFlight.current = false;
    if (latestPendingFrame.current) {
      const nextFrame = latestPendingFrame.current;
      latestPendingFrame.current = null;
      setPendingFramesCount(0);
      
      isInferenceInFlight.current = true;
      sendFramePacket(nextFrame);
    }
  };

  // WebSocket Connection Lifecycle
  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000";
    console.log("[WEBSOCKET] Connecting to ML socket:", socketUrl);
    
    const socket = io(socketUrl, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      timeout: 10000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("🔌 [WEBSOCKET] Connected to ML server with ID:", socket.id);
      setSocketStatus('CONNECTED');
      // Reset flight flag on reconnect to resume frame transmission
      isInferenceInFlight.current = false;
      if (latestPendingFrame.current) {
        const nextFrame = latestPendingFrame.current;
        latestPendingFrame.current = null;
        setPendingFramesCount(0);
        isInferenceInFlight.current = true;
        sendFramePacket(nextFrame);
      }
    });

    socket.on("ml_result", (mlResult: any) => {
      processDetectionResults(mlResult);
    });

    socket.on("violation_count_update", (data: { cheatCount: number }) => {
      violationCountRef.current = data.cheatCount;
      setViolationCount(data.cheatCount);
    });

    socket.on("disconnect", (reason) => {
      console.log("🔌 [WEBSOCKET] Disconnected:", reason);
      setSocketStatus('DISCONNECTED');
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Draw ML Bounding Boxes with Responsive Scaling
  const drawBoundingBoxes = (
    faces: Array<{ x: number; y: number; width: number; height: number; confidence: number }>,
    objects: Array<{ class: string; confidence: number; x: number; y: number; width: number; height: number }>,
    videoWidth: number,
    videoHeight: number
  ) => {
    const canvas = canvasOverlayRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const displayWidth = canvas.clientWidth || videoWidth || 320;
    const displayHeight = canvas.clientHeight || videoHeight || 240;

    canvas.width = displayWidth;
    canvas.height = displayHeight;
    ctx.clearRect(0, 0, displayWidth, displayHeight);

    const scaleX = displayWidth / (videoWidth || 320);
    const scaleY = displayHeight / (videoHeight || 240);

    // 1. Draw Faces (Emerald Green)
    faces.forEach((face) => {
      const fx = Math.round(face.x * scaleX);
      const fy = Math.round(face.y * scaleY);
      const fw = Math.round(face.width * scaleX);
      const fh = Math.round(face.height * scaleY);

      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2.5;
      ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
      ctx.strokeRect(fx, fy, fw, fh);
      ctx.fillRect(fx, fy, fw, fh);

      // Label Pill
      const label = `Face ${(face.confidence * 100).toFixed(0)}%`;
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 11px monospace';
      const textWidth = ctx.measureText(label).width;
      ctx.fillRect(fx, Math.max(0, fy - 18), textWidth + 8, 18);
      ctx.fillStyle = '#000000';
      ctx.fillText(label, fx + 4, Math.max(12, fy - 4));
    });

    // 2. Draw Objects
    objects.forEach((obj) => {
      const ox = Math.round(obj.x * scaleX);
      const oy = Math.round(obj.y * scaleY);
      const ow = Math.round(obj.width * scaleX);
      const oh = Math.round(obj.height * scaleY);

      const isUnauthorized = ['cell phone', 'phone', 'remote', 'laptop', 'book', 'tablet', 'tv', 'keyboard'].includes(obj.class.toLowerCase());
      const strokeColor = isUnauthorized ? '#f43f5e' : '#06b6d4';
      const fillColor = isUnauthorized ? 'rgba(244, 63, 94, 0.20)' : 'rgba(6, 182, 212, 0.08)';

      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = isUnauthorized ? 3 : 1.5;
      ctx.fillStyle = fillColor;
      ctx.strokeRect(ox, oy, ow, oh);
      ctx.fillRect(ox, oy, ow, oh);

      // Label
      const label = `${isUnauthorized ? '🚨 ' : ''}${obj.class.toUpperCase()} ${(obj.confidence * 100).toFixed(0)}%`;
      ctx.fillStyle = strokeColor;
      ctx.font = 'bold 10px monospace';
      const textWidth = ctx.measureText(label).width;
      ctx.fillRect(ox, Math.max(0, oy - 16), textWidth + 8, 16);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, ox + 4, Math.max(11, oy - 4));
    });
  };

  // Real-Time Frame Inference Loop (Runs smoothly at 10 FPS with temporal and memory optimization)
  useEffect(() => {
    let active = true;
    let intervalId: NodeJS.Timeout;

    const performInference = async () => {
      if (!videoRef.current || !active) return;
      const video = videoRef.current;

      if (video.readyState < video.HAVE_METADATA || video.videoWidth === 0) return;

      const captureStart = performance.now();
      const frameId = frameCounter.current + 1;
      frameCounter.current = frameId;
      
      const captureTime = performance.now() - captureStart;

      const resizeStart = performance.now();
      const offscreenCanvas = document.createElement('canvas');
      const targetWidth = 640; // 640x360 for high-accuracy phone/object and face monitoring
      const aspectRatio = video.videoHeight / video.videoWidth;
      offscreenCanvas.width = targetWidth;
      offscreenCanvas.height = Math.round(targetWidth * (isNaN(aspectRatio) || aspectRatio === 0 ? 0.75 : aspectRatio));
      const offscreenCtx = offscreenCanvas.getContext('2d');
      
      if (!offscreenCtx) return;
      offscreenCtx.drawImage(video, 0, 0, offscreenCanvas.width, offscreenCanvas.height);
      const resizeTime = performance.now() - resizeStart;

      const encodeStart = performance.now();
      offscreenCanvas.toBlob(async (blob) => {
        if (!blob) {
          isInferenceInFlight.current = false;
          return;
        }
        const encodeTime = performance.now() - encodeStart;
        const arrayBuffer = await blob.arrayBuffer();

        // Target FPS frequencies: Face (10 FPS) is every frame; Object (5 FPS) is every 2nd frame.
        const runFace = true;
        const runObject = (frameId % 2 === 0);

        const packet = {
          arrayBuffer,
          frameId,
          timestamp: Date.now(),
          captureTime,
          resizeTime,
          encodeTime,
          runFace,
          runObject
        };

        if (isInferenceInFlight.current) {
          // Latest-frame-only buffer (overwrite pending frame)
          if (latestPendingFrame.current) {
            droppedFramesCounter.current++;
            setDroppedFramesCount(droppedFramesCounter.current);
          }
          latestPendingFrame.current = packet;
          setPendingFramesCount(1);
        } else {
          isInferenceInFlight.current = true;
          sendFramePacket(packet);
        }
      }, 'image/jpeg', 0.6);
    };

    const runInferenceLoop = async () => {
      if (!active) return;
      await performInference();
      if (active) {
        intervalId = setTimeout(runInferenceLoop, 100); // 100ms throttle interval to target 10 FPS
      }
    };

    intervalId = setTimeout(runInferenceLoop, 500);

    return () => {
      active = false;
      if (intervalId) clearTimeout(intervalId);
    };
  }, []);

  const sendFramePacket = (packet: any) => {
    const socket = socketRef.current;
    if (socket && socket.connected) {
      socket.emit('ml_frame', packet.arrayBuffer, {
        runFace: packet.runFace,
        runObject: packet.runObject,
        metadata: {
          frameId: packet.frameId,
          timestamp: packet.timestamp,
          captureTime: packet.captureTime,
          resizeTime: packet.resizeTime,
          encodeTime: packet.encodeTime,
          sessionId: sessionId || null
        }
      });
    } else {
      isInferenceInFlight.current = false;
    }
  };

  // Boot sequence loading texts
  useEffect(() => {
     if (isCameraReady) return;
     const texts = ["We are about to start...", "Initializing secure camera...", "Just a few more seconds...", "Loading AI algorithms..."];
     let idx = 0;
     const interval = setInterval(() => {
        idx = (idx + 1) % texts.length;
        setLoadingText(texts[idx]);
     }, 2500);
     return () => clearInterval(interval);
  }, [isCameraReady]);

  const handleProctorViolation = (reason: string) => {
    triggerViolation(
      reason,
      reason === "MOBILE_PHONE" 
        ? "Unauthorized device (Mobile Phone) detected in frame!" 
        : "Face not detected in camera view for 3 seconds!"
    );
  };

  const handleRecordToggle = async () => {
    if (isRecording) {
      const blob = await stopRecording();
      setIsProcessing(true);
      
      try {
        // 1. Send Audio to STT
        const transcript = await transcribeAudioAPI(blob);
        
        if (!transcript.trim()) {
           console.log("Empty transcript, please try again.");
           setIsProcessing(false);
           return;
        }

        // Add User Message
        addMessage({
          id: Math.random().toString(),
          role: "user",
          content: transcript,
        });

        const activeSessionId = sessionId || sessionIdRef.current;
        if (!activeSessionId) {
          throw new Error("No active session found. Please wait or refresh the interview.");
        }

        // 2. Fetch AI Response
        const reply = await respondInterviewAPI(activeSessionId, transcript);
        
        addMessage({
          id: Math.random().toString(),
          role: "assistant",
          content: reply.reply,
        });

        if (reply.cutoff) {
          await handleFinish();
        }

      } catch (error: any) {
        console.error("Pipeline failed", error);
        toast.error("Error Processing Response", {
          description: error?.response?.data?.message || error.message || "Failed to process interview response. Please try again."
        });
      } finally {
        setIsProcessing(false);
      }
    } else {
      try {
        await startRecording();
      } catch (err: any) {
        toast.error("Microphone Access Denied", {
           description: "Please allow microphone access in your browser settings to continue the interview."
        });
      }
    }
  };

  const handleGenerateQuestion = async () => {
    setIsProcessing(true);
    try {
      const activeSessionId = sessionId || sessionIdRef.current;
      if (!activeSessionId) {
        throw new Error("No active session found. Please wait or refresh the interview.");
      }
      
      addMessage({
        id: Math.random().toString(),
        role: "user",
        content: "[Requested next question]",
      });

      const reply = await respondInterviewAPI(activeSessionId, "Please ask the next question or give me another scenario.");
      
      addMessage({
        id: Math.random().toString(),
        role: "assistant",
        content: reply.reply,
      });

      if (reply.cutoff) {
        await handleFinish();
      }

    } catch (error: any) {
      console.error("Failed to generate question", error);
      toast.error("Error Generating Question", {
        description: error?.response?.data?.message || error.message || "Failed to process request."
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinish = async () => {
    setIsEvaluating(true);
    let score = 0;
    if (engagementStats.current.totalFrames > 0) {
       score = Math.round((engagementStats.current.faceDetectedFrames / engagementStats.current.totalFrames) * 10);
    }
    
    try {
      const evaluationResult = await evaluateInterviewAPI(sessionId!, Math.max(1, score), cheatFlags.current);
      setEvaluation(evaluationResult);
      setShowFeedbackModal(true);
    } catch (error: any) {
      console.error("Evaluation failed", error);
      toast.error("Evaluation Error", {
        description: "Encountered an issue generating the final report. Retrying might solve this."
      });
      setIsEvaluating(false);
    }
  };

  const handleStartInterview = async () => {
    setIsStartingInterview(true);
    setIsSetupComplete(true); // Transition immediately to interview page
    try {
      const candidateEmail = user?.primaryEmailAddress?.emailAddress;
      const candidateName = user?.fullName || user?.firstName || (candidateEmail ? candidateEmail.split("@")[0] : "Candidate");
      
      const apiData = await startInterviewAPI(candidateName, candidateEmail);
      if (apiData) {
        setSessionId(apiData.sessionId);
        addMessage({
          id: "msg_first",
          role: "assistant",
          content: apiData.question,
        });
        toast.success("Interview Started", {
          description: "AI Interviewer is ready. Speak clearly into your microphone."
        });
      }
    } catch (err: any) {
      console.error("Failed to start session:", err);
      toast.error("Failed to start interview", {
        description: err?.message || "Please check backend connection and retry."
      });
      setSessionFailed(true);
    } finally {
      setIsStartingInterview(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackText.trim()) {
      toast.error("Please enter some feedback.");
      return;
    }
    setIsSubmittingFeedback(true);
    try {
      await submitFeedbackAPI(sessionId!, feedbackText);
      toast.success("Feedback submitted!");
      router.push("/dashboard");
    } catch (error) {
      toast.error("Failed to submit feedback.");
      setIsSubmittingFeedback(false);
    }
  };

  const handleSkipFeedback = () => {
      router.push("/dashboard");
  };

  return (
    <div className="flex flex-col h-screen bg-black overflow-hidden relative">
      
      {/* Session Failure Overlay */}
      {sessionFailed && (
       <div className="absolute inset-0 z-[100] flex flex-col bg-black items-center justify-center p-6 text-center">
          <p className="text-rose-500 font-medium text-xl">Failed to secure an encrypted session key.</p>
          <p className="text-zinc-500 text-sm mt-2">The OpenAI back-end might be unreachable or timed out.</p>
          <Button onClick={() => router.push('/')} className="mt-6 bg-zinc-800 text-white">Return to Secure Hub</Button>
       </div>
      )}

      {/* Boot Sequencer Loading Screen */}
      <AnimatePresence>
        {!isCameraReady && (
           <motion.div 
             exit={{ opacity: 0, scale: 1.05 }}
             transition={{ duration: 0.6, ease: "easeInOut" }}
             className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black"
           >
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black pointer-events-none" />
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="z-10 flex flex-col items-center max-w-sm text-center"
              >
                 <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(34,211,238,0.1)]">
                    <ScanFace className="w-8 h-8 text-cyan-500 animate-pulse" />
                 </div>
                 <motion.p 
                    key={loadingText}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="text-white font-medium tracking-wider"
                 >
                    {loadingText}
                 </motion.p>
                 <p className="text-zinc-500 text-sm mt-3 animate-pulse">Initializing ML vision models & video streams</p>
              </motion.div>
           </motion.div>
        )}
      </AnimatePresence>

      {/* Premium Dark Space Background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-violet-900/10 via-black to-black pointer-events-none" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-900/20 blur-[150px] rounded-full pointer-events-none" />

      {/* PERSISTENT CAMERA FEED WRAPPER (Never unmounts, transitions styling smoothly) */}
      <div 
        onClick={!isSetupComplete && !isVideoActive ? requestCameraAccess : undefined}
        className={`z-20 border border-white/10 shadow-2xl transition-all duration-500 ease-in-out overflow-hidden bg-black ${
          !isSetupComplete 
            ? "absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md aspect-video rounded-2xl" 
            : "absolute top-24 right-6 w-48 h-64 rounded-xl"
        }`}
      >
        {/* Status Pill on Camera Feed */}
        <div className="absolute top-3 left-3 z-30 flex items-center gap-2 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
          <span className={`w-2 h-2 rounded-full ${faceState === 'PRESENT' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : isVideoActive ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-200">
            {faceState === 'PRESENT' ? "Face Verified" : isVideoActive ? "Camera Live" : "Camera Offline"}
          </span>
        </div>

        {!isVideoActive && (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-zinc-500">
             <CameraOff className="w-6 h-6" />
             <span className="text-xs uppercase">No Signal</span>
          </div>
        )}

        <video 
          ref={attachVideoRef} 
          autoPlay 
          playsInline 
          muted 
          className="w-full h-full object-cover"
        />

        {/* Real-time Server ML Canvas Overlay */}
        <canvas 
          ref={canvasOverlayRef}
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
        />

        {/* Live Server Inference Latency Pill */}
        {isVideoActive && (
          <div className="absolute bottom-3 right-3 z-30 flex items-center gap-1.5 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 text-[9px] text-zinc-300 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>Server Vision: {inferenceLatency}ms</span>
          </div>
        )}
      </div>

      {/* SETUP & CALIBRATION VIEW */}
      {!isSetupComplete ? (
        <div className="z-10 flex-1 flex flex-col items-center justify-center p-6 max-w-2xl mx-auto w-full">
          <div className="w-full bg-zinc-900/60 border border-white/10 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl flex flex-col items-center gap-6">
            
            <div className="text-center space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                AI Proctoring Setup
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Camera & Face Verification</h1>
              <p className="text-zinc-400 text-sm max-w-md mx-auto">
                Position yourself in the frame. The interview will unlock automatically once your face is recognized and the security check completes.
              </p>
            </div>

            {/* Live Camera Preview Placeholder (Spacer for persistent absolute overlay) */}
            <div className="w-full max-w-md aspect-video rounded-2xl pointer-events-none bg-zinc-950/40 border border-white/5" />

            {/* Verification Checklist (Camera, Microphone, Face) */}
            <div className="w-full max-w-md grid grid-cols-3 gap-2 text-xs">
              <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-black/40 border border-white/5 text-zinc-300 text-center gap-1.5">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[11px] ${isVideoActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}>
                  {isVideoActive ? "✓" : "●"}
                </div>
                <span className="text-[11px]">Camera</span>
              </div>
              <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-black/40 border border-white/5 text-zinc-300 text-center gap-1.5">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[11px] ${isMicActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}>
                  {isMicActive ? "✓" : "●"}
                </div>
                <span className="text-[11px]">Microphone</span>
              </div>
              <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-black/40 border border-white/5 text-zinc-300 text-center gap-1.5">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[11px] ${faceState === 'PRESENT' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400 animate-pulse'}`}>
                  {faceState === 'PRESENT' ? "✓" : "●"}
                </div>
                <span className="text-[11px]">Face Detected</span>
              </div>
            </div>

            {/* AI Monitoring Pre-Flight Check */}
            <div className="w-full max-w-md p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2.5 text-xs text-zinc-300 font-mono">
              <div className="text-zinc-400 font-bold uppercase tracking-wider text-[10px] pb-1.5 border-b border-white/5 flex justify-between items-center">
                <span>AI Monitoring Status</span>
                <span className={
                  isVideoActive && isMicActive && faceState === 'PRESENT' && socketStatus === 'CONNECTED' && inferenceLatency > 0
                    ? "text-emerald-400 font-bold animate-pulse"
                    : "text-amber-400 font-bold"
                }>
                  {isVideoActive && isMicActive && faceState === 'PRESENT' && socketStatus === 'CONNECTED' && inferenceLatency > 0 ? "✓ READY TO START" : "● INITIALIZING"}
                </span>
              </div>
              
              <div className="space-y-1.5 text-[10px]">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">Camera permission & stream:</span>
                  <span className={isVideoActive ? "text-emerald-400" : "text-rose-400 font-bold"}>
                    {isVideoActive ? "✓ ACTIVE" : "✗ PENDING"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">Microphone permission:</span>
                  <span className={isMicActive ? "text-emerald-400" : "text-rose-400 font-bold"}>
                    {isMicActive ? "✓ ACTIVE" : "✗ PENDING"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">Face verify (10 FPS BlazeFace):</span>
                  <span className={faceState === 'PRESENT' ? "text-emerald-400" : "text-amber-400"}>
                    {faceState === 'PRESENT' ? "✓ VERIFIED" : "● POSITION FACE IN FRAME"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">Real-time WebSocket tunnel:</span>
                  <span className={socketStatus === 'CONNECTED' ? "text-emerald-400" : "text-amber-400"}>
                    {socketStatus === 'CONNECTED' ? "✓ CONNECTED" : "● CONNECTING..."}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">Server ML model response:</span>
                  <span className={inferenceLatency > 0 ? "text-emerald-400" : "text-amber-400"}>
                    {inferenceLatency > 0 ? "✓ RESPONDING" : "● WAITING FOR FIRST RESPONSE..."}
                  </span>
                </div>
              </div>
            </div>

            {/* Start Action Gated on Pre-Flight Checks */}
            <div className="w-full max-w-md pt-2">
              <Button
                size="lg"
                onClick={handleStartInterview}
                disabled={isStartingInterview || !isVideoActive || !isMicActive || faceState !== 'PRESENT' || socketStatus !== 'CONNECTED' || inferenceLatency === 0}
                className={`w-full py-6 text-base font-semibold rounded-2xl transition-all duration-300 ${
                  isVideoActive && isMicActive && faceState === 'PRESENT' && socketStatus === 'CONNECTED' && inferenceLatency > 0
                    ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:opacity-95 text-white shadow-[0_0_30px_rgba(16,185,129,0.4)] cursor-pointer' 
                    : 'bg-zinc-800 text-zinc-400 border border-zinc-700/50 cursor-not-allowed'
                }`}
              >
                {isStartingInterview ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Starting AI Session...
                  </span>
                ) : isVideoActive && isMicActive && faceState === 'PRESENT' && socketStatus === 'CONNECTED' && inferenceLatency > 0 ? (
                  <span className="flex items-center gap-2">
                    Start Interview Now <ArrowRight className="w-5 h-5" />
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    AI Monitoring Initializing...
                  </span>
                )}
              </Button>
            </div>

          </div>
        </div>
      ) : (
        <>
          {/* Header */}
          <header className="px-6 py-4 flex justify-between items-center border-b border-white/5 bg-black/40 backdrop-blur-2xl z-10">
            <div className="flex items-center gap-3 relative">
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)] animate-pulse" />
              <span className="text-zinc-200 font-semibold tracking-wider uppercase text-xs">Lumina Core Active</span>
            </div>

            {/* Live Security HUD Indicator */}
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border backdrop-blur-md transition-all ${
                violationCount > 0 
                  ? "bg-rose-500/10 border-rose-500/30 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.2)] animate-pulse" 
                  : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              }`}>
                <span className={`w-2 h-2 rounded-full ${violationCount > 0 ? "bg-rose-500" : "bg-emerald-400"}`} />
                Misconduct Score: {violationCount} pts
              </div>
            </div>

            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleFinish}
              disabled={isProcessing || isRecording || isEvaluating || !sessionId}
              className="border-white/10 text-zinc-300 hover:bg-white/5 hover:text-white backdrop-blur-md transition-all rounded-full px-6"
            >
              {isEvaluating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Conclude Session"}
            </Button>
          </header>

          {/* Chat Area */}
          <main className="flex-1 overflow-y-auto px-4 py-8 md:px-0 scroll-smooth z-10 w-full max-w-3xl mx-auto space-y-6">
            <AnimatePresence initial={false}>
              {messages.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex w-full justify-start"
                >
                  <div className="bg-black/60 border border-cyan-500/30 text-zinc-200 rounded-3xl rounded-tl-sm p-6 max-w-[85%] shadow-2xl backdrop-blur-md flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shrink-0">
                      <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Initializing AI Interview</p>
                      <p className="text-xs text-zinc-400 mt-0.5">Lumina AI is preparing your first scenario question...</p>
                    </div>
                  </div>
                </motion.div>
              )}
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex w-full ${msg.role === "assistant" ? "justify-start" : "justify-end"}`}
                >
                  <div 
                    className={`max-w-[80%] rounded-3xl p-5 leading-relaxed tracking-wide text-sm md:text-base border shadow-2xl backdrop-blur-md ${
                      msg.role === "assistant" 
                      ? "bg-black/60 border-white/10 text-zinc-100 rounded-tl-sm shadow-[0_4px_30px_rgba(0,0,0,0.5)]" 
                      : "bg-gradient-to-tr from-cyan-600 to-cyan-500 border-cyan-400/20 text-white rounded-tr-sm shadow-[0_4px_25px_rgba(34,211,238,0.25)]"
                    }`}
                  >
                    {msg.content}
                  </div>
                </motion.div>
              ))}
              {isProcessing && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex w-full justify-start"
                >
                  <div className="bg-zinc-900/50 border border-white/5 rounded-2xl rounded-bl-sm p-4 flex items-center gap-2">
                    <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce delay-100" />
                    <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce delay-200" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </main>

          {/* Interactive Controls (Mic) */}
          <div className="relative w-full pb-8 pt-4 flex justify-center items-center z-10 bg-gradient-to-t from-black via-black/80 to-transparent">
            <button
              onClick={handleRecordToggle}
              disabled={isProcessing}
              className={`relative group flex items-center justify-center w-24 h-24 rounded-full transition-all duration-500 ease-out focus:outline-none ${
                 isProcessing 
                  ? "bg-zinc-900 border border-white/5 cursor-not-allowed"
                  : isRecording 
                    ? "bg-red-500/10 border border-red-500/50 shadow-[0_0_50px_rgba(239,68,68,0.4)]" 
                    : "bg-gradient-to-br from-cyan-400 to-violet-500 shadow-[0_0_40px_rgba(139,92,246,0.4)] hover:shadow-[0_0_60px_rgba(34,211,238,0.6)] hover:scale-105 border border-white/20"
              }`}
            >
              {isRecording ? (
                <div className="w-8 h-8 bg-red-500 rounded-sm animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.8)]" />
              ) : isProcessing ? (
                <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
              ) : (
                <Mic className="w-10 h-10 text-white drop-shadow-md" />
              )}

              {/* Premium Aurora Recording Rings */}
              {isRecording && (
                <>
                  <span className="absolute w-[160%] h-[160%] border border-red-500/40 rounded-full animate-ping duration-[3000ms]" />
                  <span className="absolute w-[130%] h-[130%] border border-red-500/60 rounded-full animate-ping duration-[2000ms]" />
                </>
              )}
            </button>
            
            <Button 
              onClick={handleGenerateQuestion} 
              disabled={isProcessing || isRecording || !sessionId}
              title={!sessionId ? "Waiting for session to start..." : "Generate a new question"}
              className={`absolute right-10 md:right-20 border rounded-xl px-4 py-2 flex items-center gap-2 transition-all shadow-lg ${
                sessionId && !isProcessing && !isRecording
                  ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-white/10 cursor-pointer"
                  : "bg-zinc-900 text-zinc-600 border-zinc-800 cursor-not-allowed"
              }`}
            >
              {!sessionId ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Session loading...</>
              ) : (
                <>Generate Question <ArrowRight className="w-4 h-4" /></>
              )}
            </Button>
          </div>
        </>
      )}

      {/* Feedback Modal Overlay */}
      <AnimatePresence>
        {showFeedbackModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-zinc-900 border border-zinc-700 w-full max-w-lg rounded-2xl p-6 shadow-2xl flex flex-col gap-6"
            >
              <div className="flex items-center gap-4 border-b border-zinc-800 pb-4">
                <div className="w-12 h-12 bg-teal-500/20 rounded-full flex items-center justify-center">
                  <MessageSquareHeart className="w-6 h-6 text-teal-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">Interview Concluded</h2>
                  <p className="text-sm text-zinc-400">Please provide feedback about your experience.</p>
                </div>
              </div>
              
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="What problems did you face? How could we improve this AI Interview?"
                className="w-full h-32 bg-black border border-zinc-800 rounded-xl p-4 text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-teal-500 resize-none"
              />

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="ghost" className="text-zinc-400 hover:text-white hover:bg-zinc-800" onClick={handleSkipFeedback}>
                  Skip
                </Button>
                <Button 
                  onClick={handleSubmitFeedback} 
                  disabled={isSubmittingFeedback}
                  className="bg-teal-600 hover:bg-teal-500 text-white font-medium px-6"
                >
                  {isSubmittingFeedback ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit & Finish"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* REAL-TIME ML DEBUG PANEL (HUD) */}
      <div className="fixed bottom-4 left-4 z-50 font-mono text-[11px] select-none">
        {showDebugPanel ? (
          <div className="bg-black/90 border border-cyan-500/30 backdrop-blur-2xl rounded-2xl p-4 shadow-[0_0_40px_rgba(0,0,0,0.85)] text-zinc-300 w-80 space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2 text-cyan-400 font-bold tracking-wider uppercase text-xs">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                ML Performance Dashboard
              </div>
              <button 
                onClick={() => setShowDebugPanel(false)} 
                className="text-zinc-500 hover:text-white text-xs px-1.5 py-0.5 rounded bg-zinc-800 transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Performance Stats */}
            <div className="space-y-1 text-[10px]">
              <div className="flex justify-between">
                <span className="text-zinc-500">Camera FPS:</span>
                <span className="text-emerald-400 font-bold">{cameraFps} FPS</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Inference Rate:</span>
                <span className="text-cyan-300 font-bold">{inferenceFps} FPS</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Frame Size:</span>
                <span>640x360</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Encode Time:</span>
                <span>{encodeTime} ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Network Latency:</span>
                <span>{networkTime} ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Decode Time:</span>
                <span>{decodeTime} ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Face Inference:</span>
                <span className="text-emerald-300 font-bold">{faceInferenceTime} ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Object Inference:</span>
                <span className="text-cyan-300 font-bold">{objectInferenceTime} ms</span>
              </div>
              <div className="flex justify-between font-bold text-cyan-400">
                <span>End-to-End Latency:</span>
                <span>{totalEndToEndTime} ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Pending Frames:</span>
                <span className={pendingFramesCount > 0 ? "text-amber-400 font-bold" : "text-zinc-400"}>{pendingFramesCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Dropped Frames:</span>
                <span className="text-zinc-400">{droppedFramesCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Heap Memory:</span>
                <span>{memoryUsage > 0 ? `${memoryUsage} MB` : "N/A"}</span>
              </div>
            </div>

            {/* Face Status */}
            <div className="border-t border-white/10 pt-2 space-y-1 text-[10px]">
              <div className="text-zinc-400 font-bold uppercase text-[9px] tracking-wider text-emerald-400">FACE TRACKING</div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Detections:</span>
                <span className="font-bold">{detectedFaceCount} (Conf: {(faceConfidence * 100).toFixed(0)}%)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">State:</span>
                <span className={`font-bold px-1.5 py-0.5 rounded text-[9px] tracking-wider ${
                  faceState === 'PRESENT' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                  faceState === 'ABSENCE_CANDIDATE' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                  'bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse'
                }`}>
                  {faceState}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Frames (+ / -):</span>
                <span>+{consecutivePositiveFaces.current} / -{consecutiveMissedFaces.current}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Absence Timer:</span>
                <span className={absenceTimerDisplay > 0 ? "text-rose-400 font-bold animate-pulse" : "text-zinc-400"}>
                  {absenceTimerDisplay.toFixed(1)}s / 3.0s
                </span>
              </div>
            </div>

            {/* Objects Status */}
            <div className="border-t border-white/10 pt-2 space-y-1 text-[10px]">
              <div className="text-zinc-400 font-bold uppercase text-[9px] tracking-wider text-cyan-400">OBJECTS & DEVICES</div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Detected:</span>
                <span className="font-mono truncate max-w-[150px]">
                  {detectedObjectsList.length > 0 
                    ? detectedObjectsList.map(o => `${o.class} (${(o.confidence * 100).toFixed(0)}%)`).join(', ')
                    : 'None'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Device State:</span>
                <span className={`font-bold ${
                  objectState === 'VIOLATION_REPORTED' ? 'text-rose-400 animate-pulse' :
                  objectState === 'CONFIRMED' ? 'text-rose-400' :
                  objectState === 'CANDIDATE' ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {objectState}
                </span>
              </div>
            </div>

            {/* WebSocket Status */}
            <div className="border-t border-white/10 pt-2 flex justify-between text-[9px]">
              <span className="text-zinc-500">WebSocket Transport:</span>
              <span className={socketStatus === 'CONNECTED' ? "text-emerald-400 font-bold" : "text-amber-400"}>
                {socketStatus}
              </span>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowDebugPanel(true)}
            className="bg-black/80 border border-white/10 backdrop-blur-md px-3 py-1.5 rounded-full text-zinc-300 hover:text-white flex items-center gap-1.5 shadow-xl hover:border-cyan-400 transition-all text-xs cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            Show ML Debug HUD
          </button>
        )}
      </div>
    </div>
  );
}
