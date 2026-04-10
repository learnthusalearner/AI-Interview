"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Square, Loader2, ArrowRight } from "lucide-react";
import { useInterviewStore } from "@/lib/store";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { transcribeAudioAPI, respondInterviewAPI, evaluateInterviewAPI, submitFeedbackAPI, updateApplicationStatusAPI, startInterviewAPI, sendProctoringFrameAPI } from "@/services/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Copy, Check, MessageSquareHeart, Camera, CameraOff, ScanFace } from "lucide-react";
import { useUser } from "@clerk/nextjs";

export default function InterviewPage() {
  const router = useRouter();
  const { user } = useUser();
  const { sessionId, setSessionId, messages, addMessage, setEvaluation } = useInterviewStore();
  const { isRecording, startRecording, stopRecording } = useAudioRecorder();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isBootingRef = useRef(false);
  const [isVideoActive, setIsVideoActive] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const sessionIdRef = useRef<string | null>(null);
  
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);
  const engagementStats = useRef({ totalFrames: 0, faceDetectedFrames: 0 });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const proctorViolations = useRef(0);
  
  const cheatFlags = useRef<string[]>([]);
  const lastToastTime = useRef<number>(0);
  
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [loadingText, setLoadingText] = useState("We are about to start...");
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // If we land here directly without user context, they probably refreshed.
    // The initVideo hook will automatically handle this by starting a new session
    // using their clerk hook context.
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Video Processing Polling via Backend
  useEffect(() => {
    let active = true;
    let intervalId: NodeJS.Timeout;

    // hidden canvas to capture frame
    if (!canvasRef.current) {
        canvasRef.current = document.createElement("canvas");
    }

    const captureAndAnalyzeFrame = async () => {
      const currentSessionId = sessionIdRef.current;
      if (!videoRef.current || !active || !currentSessionId) return;
      
      const video = videoRef.current;
      if (video.readyState !== video.HAVE_ENOUGH_DATA) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64Image = canvas.toDataURL("image/jpeg", 0.5);

      try {
        const result = await sendProctoringFrameAPI(currentSessionId, base64Image);
        engagementStats.current.totalFrames += 1;
        
        if (result.faceDetected) {
          engagementStats.current.faceDetectedFrames += 1;
          setFaceDetected(true);
          proctorViolations.current = 0; // Reset absence counter
        } else {
          setFaceDetected(false);
          proctorViolations.current += 1;
          // ~3-4 frames absence (~9-12 seconds since we poll every 3s)
          if (proctorViolations.current > 3) {
            handleProctorViolation("ABSENT_USER");
            proctorViolations.current = 0; 
          }
        }

        if (result.phoneDetected) {
          handleProctorViolation("MOBILE_PHONE");
        }

      } catch (err) {
        // ignore occasional network error
      }
    };

    const initVideo = async () => {
      if (isBootingRef.current) return;
      isBootingRef.current = true;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        streamRef.current = stream;
        if (videoRef.current) {
           videoRef.current.srcObject = stream;
           videoRef.current.play().catch(e => console.warn(e));
        }
        setIsVideoActive(true);

        const candidateEmail = user?.primaryEmailAddress?.emailAddress;
        const candidateName = user?.fullName || user?.firstName || (candidateEmail ? candidateEmail.split("@")[0] : "Candidate");

        if (!sessionId) {
            const apiData = await startInterviewAPI(candidateName, candidateEmail);
            if (apiData) {
              setSessionId(apiData.sessionId);
              addMessage({
                id: "msg_first",
                role: "assistant",
                content: apiData.question,
              });
            }
        }

        setIsCameraReady(true);
        
        // Start polling analysis loop every 3 seconds
        intervalId = setInterval(captureAndAnalyzeFrame, 3000);
      } catch (err) {
        console.warn("Camera access denied or failed to load.", err);
      }
    };
    
    initVideo();

    return () => {
      active = false;
      if (intervalId) clearInterval(intervalId);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []); // Reverted to [] to prevent camera teardown on sessionId change

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
     const now = Date.now();
     // Prevent toast spam (1 per 10 seconds)
     if (now - lastToastTime.current > 10000) {
        lastToastTime.current = now;
        cheatFlags.current.push(reason);
        toast.error("SECURITY WARNING", {
          description: reason === "MOBILE_PHONE" ? "Unauthorized device detected. Please put your phone away." : "Please ensure your face is clearly visible in the camera."
        });
     }
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

        // 2. Fetch AI Response
        const reply = await respondInterviewAPI(sessionId!, transcript);
        
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
        toast.error("Transcription Failed", {
          description: "We couldn't process your audio. Please check your mic or connection and try again."
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
      {isCameraReady && !sessionId && (
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
                 <p className="text-zinc-500 text-sm mt-3 animate-pulse">Initializing TFJS weights & WebGL engine</p>
              </motion.div>
           </motion.div>
        )}
      </AnimatePresence>

      {/* Premium Dark Space Background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-violet-900/10 via-black to-black pointer-events-none" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-900/20 blur-[150px] rounded-full pointer-events-none" />

      {/* Header */}
      <header className="px-6 py-4 flex justify-between items-center border-b border-white/5 bg-black/40 backdrop-blur-2xl z-10">
        <div className="flex items-center gap-3 relative">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)] animate-pulse" />
          <span className="text-zinc-200 font-semibold tracking-wider uppercase text-xs">Lumina Core Active</span>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleFinish}
          disabled={isProcessing || isRecording || isEvaluating}
          className="border-white/10 text-zinc-300 hover:bg-white/5 hover:text-white backdrop-blur-md transition-all rounded-full px-6"
        >
          {isEvaluating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Conclude Session"}
        </Button>
      </header>

      {/* Video Intelligence Feed (Draggable/Floating or Fixed Corner) */}
      <div className="absolute top-24 right-6 w-48 h-64 rounded-xl overflow-hidden bg-zinc-900 border border-white/10 shadow-2xl z-20 hidden md:block">
        <div className="absolute top-2 left-2 z-30 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md">
           <ScanFace className={`w-3 h-3 ${faceDetected ? 'text-emerald-400' : 'text-zinc-500'}`} />
           <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-300">
             {faceDetected ? 'Engaged' : 'Scanning'}
           </span>
        </div>
        {!isVideoActive && (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-zinc-500">
             <CameraOff className="w-6 h-6" />
             <span className="text-xs uppercase">No Signal</span>
          </div>
        )}
        <video 
           ref={videoRef} 
           autoPlay 
           playsInline 
           muted 
           className={`w-full h-full object-cover transition-opacity duration-1000 ${isVideoActive ? 'opacity-100' : 'opacity-0'} ${!faceDetected && isVideoActive ? 'grayscale' : ''}`}
        />
        {/* Mock Face Bounding Box Scanner */}
        {isVideoActive && faceDetected && (
          <div className="absolute inset-8 border border-emerald-500/30 rounded flex items-center justify-center pointer-events-none">
             <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-emerald-400" />
             <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-emerald-400" />
             <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-emerald-400" />
             <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-emerald-400" />
          </div>
        )}
      </div>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto px-4 py-8 md:px-0 scroll-smooth z-10 w-full max-w-3xl mx-auto space-y-6">
        <AnimatePresence initial={false}>
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
      </div>

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
    </div>
  );
}
