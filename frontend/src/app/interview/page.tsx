"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Square, Loader2, ArrowRight } from "lucide-react";
import { useInterviewStore } from "@/lib/store";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { transcribeAudioAPI, respondInterviewAPI, evaluateInterviewAPI, submitFeedbackAPI } from "@/services/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Copy, Check, MessageSquareHeart } from "lucide-react";

export default function InterviewPage() {
  const router = useRouter();
  const { sessionId, messages, addMessage, setEvaluation } = useInterviewStore();
  const { isRecording, startRecording, stopRecording } = useAudioRecorder();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sessionId) {
      router.replace("/");
    }
  }, [sessionId, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
    try {
      const evalData = await evaluateInterviewAPI(sessionId!);
      setEvaluation(evalData);
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

  if (!sessionId) return null; // Wait for redirect if hit directly

  return (
    <div className="flex flex-col h-screen bg-black overflow-hidden relative">
      {/* Background Decorators */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-teal-900/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Header */}
      <header className="px-6 py-4 flex justify-between items-center border-b border-white/5 bg-black/50 backdrop-blur-md z-10">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-teal-500 shadow-[0_0_10px_rgba(20,184,166,0.6)] animate-pulse" />
          <span className="text-zinc-300 font-medium tracking-wide">Live Interview</span>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleFinish}
          disabled={isProcessing || isRecording || isEvaluating}
          className="border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white"
        >
          {isEvaluating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Complete Session"}
        </Button>
      </header>

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
                className={`max-w-[80%] rounded-2xl p-4 leading-relaxed tracking-wide text-sm md:text-base ${
                  msg.role === "assistant" 
                  ? "bg-zinc-900/80 border border-white/5 text-zinc-100 rounded-bl-sm" 
                  : "bg-teal-600/90 text-white rounded-br-sm shadow-[0_4px_20px_rgba(13,148,136,0.2)]"
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
          className={`relative group flex items-center justify-center w-20 h-20 rounded-full transition-all duration-300 ease-out focus:outline-none ${
             isProcessing 
              ? "bg-zinc-800 cursor-not-allowed"
              : isRecording 
                ? "bg-red-500/10 border border-red-500/50" 
                : "bg-teal-500 shadow-[0_0_40px_rgba(20,184,166,0.3)] hover:scale-105"
          }`}
        >
          {isRecording ? (
            <Square className="w-8 h-8 text-red-500 fill-red-500 animate-pulse" />
          ) : isProcessing ? (
            <Loader2 className="w-8 h-8 text-zinc-500 animate-spin" />
          ) : (
            <Mic className="w-8 h-8 text-black" />
          )}

          {/* UIverse Style Recording Rings */}
          {isRecording && (
            <>
              <span className="absolute w-[180%] h-[180%] border border-red-500/30 rounded-full animate-ping duration-[3000ms]" />
              <span className="absolute w-[140%] h-[140%] border border-red-500/50 rounded-full animate-ping duration-[2000ms]" />
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
