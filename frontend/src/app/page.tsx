"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mic, ArrowRight, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useInterviewStore } from "@/lib/store";
import { startInterviewAPI } from "@/services/api";
import { useUser, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

export default function LandingPage() {
  const router = useRouter();
  const { user, isLoaded, isSignedIn } = useUser();
  const [isStarting, setIsStarting] = useState(false);
  const { setCandidateName, setSessionId, addMessage } = useInterviewStore();

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignedIn || !user) {
      toast.error("Please sign in first!");
      return;
    }
    
    const candidateEmail = user.primaryEmailAddress?.emailAddress;
    const candidateName = user.fullName || user.firstName || (candidateEmail ? candidateEmail.split("@")[0] : "Candidate");

    setIsStarting(true);
    try {
      setCandidateName(candidateName);
      const data = await startInterviewAPI(candidateName, candidateEmail);
      
      setSessionId(data.sessionId);
      addMessage({
        id: "msg_first",
        role: "assistant",
        content: data.question,
      });

      router.push("/interview");
    } catch (error: any) {
      console.error("Failed to start session", error);
      toast.error("Network Error", { 
        description: "Could not connect to the interview server. Please check your connection or backend configuration." 
      });
      setIsStarting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-black flex items-center justify-center p-4">
      {/* Premium Aurora Background Blobs */}
      <div className="absolute top-0 opacity-30 transform translate-x-1/4 -translate-y-1/4 w-[600px] h-[600px] bg-cyan-600 rounded-full blur-[100px]" />
      <div className="absolute bottom-0 opacity-30 transform -translate-x-1/4 translate-y-1/4 w-[500px] h-[500px] bg-violet-600 rounded-full blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-lg z-10"
      >
        <Card className="border border-white/5 bg-black/40 backdrop-blur-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] p-8 rounded-[2rem] relative overflow-hidden">
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="h-16 w-16 bg-gradient-to-br from-cyan-500/10 to-violet-500/10 rounded-2xl flex items-center justify-center border border-white/10 shadow-inner mb-2">
              <Mic className="w-8 h-8 text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.5)]" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-4xl font-semibold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-white">
                Lumina AI
              </h1>
              <p className="text-sm text-zinc-400 tracking-wide">
                A naturally conversational, voice-driven AI waiting to interview you.
              </p>
            </div>

            <div className="w-full space-y-4 pt-4">
              {isLoaded && !isSignedIn && (
                <div className="w-full bg-zinc-900/50 border border-zinc-800 p-6 rounded-xl text-zinc-300">
                  <p className="mb-4 text-center text-sm">Please create an account or log in to apply.</p>
                  <div className="flex gap-4">
                    <SignInButton mode="modal">
                       <Button className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-semibold flex-1 border border-zinc-700">
                         Log In 
                       </Button>
                    </SignInButton>
                    <SignUpButton mode="modal">
                       <Button className="w-full bg-teal-600 hover:bg-teal-500 text-white font-semibold flex-1">
                         Sign Up 
                       </Button>
                    </SignUpButton>
                  </div>
                </div>
              )}

              {isLoaded && isSignedIn && (
                <motion.div 
                  className="space-y-6 pt-4"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                >
                  <div className="flex items-center justify-between border border-zinc-800 rounded-xl p-3 bg-zinc-900/50 backdrop-blur-md">
                    <span className="text-white text-sm">Welcome back, <span className="font-bold">{user?.fullName}</span></span>
                    <UserButton />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Lumina Glowing Interview Button */}
                    <motion.div
                      animate={{ y: [0, -6, 0] }}
                      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <Button
                        onClick={handleStart}
                        disabled={isStarting}
                        className="w-full h-32 bg-gradient-to-b from-cyan-500/10 to-transparent hover:from-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-medium rounded-2xl transition-all flex flex-col items-center justify-center gap-2 group shadow-[0_0_20px_rgba(34,211,238,0.05)] hover:shadow-[0_0_30px_rgba(34,211,238,0.2)] backdrop-blur-sm"
                      >
                        {isStarting ? (
                          <span className="animate-pulse tracking-widest text-xs uppercase">Initializing core...</span>
                        ) : (
                          <>
                            <Mic className="w-8 h-8 group-hover:scale-110 transition-transform" />
                            <span className="tracking-wide">Launch Interview</span>
                          </>
                        )}
                      </Button>
                    </motion.div>

                    {/* Admin Passkey Button */}
                    <Link href="/admin" className="block w-full">
                      <motion.div
                        animate={{ y: [0, 6, 0] }}
                        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <Button
                          variant="outline"
                          className="w-full h-32 bg-gradient-to-b from-violet-500/5 to-transparent hover:from-violet-500/10 border border-violet-500/20 text-violet-300 font-medium rounded-2xl transition-all flex flex-col items-center justify-center gap-2 group backdrop-blur-sm"
                        >
                          <Shield className="w-8 h-8 group-hover:scale-110 transition-transform text-violet-400" />
                          <span className="tracking-wide">Admin Portal</span>
                        </Button>
                      </motion.div>
                    </Link>

                    {/* Dashboard Button */}
                    <Link href="/dashboard" className="block w-full md:col-span-2 mt-2">
                       <Button
                          variant="outline"
                          className="w-full h-14 bg-zinc-900/30 hover:bg-zinc-800 border-zinc-700 text-zinc-400 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 group"
                       >
                          <span>Go to Applicant Dashboard</span>
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                       </Button>
                    </Link>
                  </div>
                </motion.div>
              )}
            </div>

          </div>
        </Card>
      </motion.div>
    </div>
  );
}
