"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCandidateSessionsAPI } from "@/services/api";

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoaded, isSignedIn } = useUser();
  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/");
    }
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    const fetchSessions = async () => {
      if (user?.primaryEmailAddress?.emailAddress) {
        try {
          const data = await getCandidateSessionsAPI(user.primaryEmailAddress.emailAddress);
          setSessions(data);
        } catch (error) {
          console.error("Failed to fetch sessions", error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    if (isLoaded && isSignedIn) {
      fetchSessions();
    }
  }, [user, isLoaded, isSignedIn]);

  if (!isLoaded || !isSignedIn) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-black py-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Decorators */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-violet-900/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-cyan-900/10 blur-[150px] rounded-full pointer-events-none" />

      <div className="max-w-4xl mx-auto space-y-8 relative z-10">
        <div className="flex justify-between items-center bg-zinc-900/40 backdrop-blur-xl p-6 rounded-2xl border border-white/5 shadow-2xl">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Applicant Portal</h1>
            <p className="text-zinc-400 mt-1">Track your Lumina AI evaluations</p>
          </div>
          <Button variant="outline" onClick={() => router.push("/")} className="border-white/10 text-white hover:bg-white/5 backdrop-blur-md">
            <ArrowLeft className="w-4 h-4 mr-2" /> Return to Hub
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-20 text-cyan-400 animate-pulse tracking-widest text-sm uppercase">Synchronizing records...</div>
        ) : (
          <div className="space-y-4">
            {sessions.length === 0 ? (
              <div className="text-center py-12 bg-black/40 backdrop-blur-md rounded-2xl border border-white/5 text-zinc-500">
                You haven't completed any evaluations yet.
              </div>
            ) : (
              sessions.map((session, idx) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-zinc-950 border border-white/5 hover:border-cyan-500/20 shadow-lg rounded-2xl p-6 flex flex-col md:flex-row justify-between items-center gap-4 transition-all hover:shadow-[0_0_20px_rgba(34,211,238,0.1)] group"
                >
                  <div>
                    <h3 className="text-xl font-medium text-zinc-200 group-hover:text-cyan-300 transition-colors">Evaluation #{session.id.slice(0, 8)}</h3>
                    <p className="text-sm text-zinc-500 font-mono mt-1">{new Date(session.createdAt).toLocaleDateString()}</p>
                  </div>
                  
                    <div className="flex items-center gap-4">

                    <div className="w-32 flex flex-col items-center">
                      <p className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] mb-1.5">Status</p>
                      {session.applicationStatus === 'PENDING' ? (
                        <div className="flex items-center justify-center gap-2 text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-4 py-1.5 rounded-full text-xs font-semibold w-full tracking-wider uppercase">
                          <Clock className="w-3 h-3" /> Pending
                        </div>
                      ) : session.applicationStatus === 'ACCEPTED' ? (
                        <div className="flex items-center justify-center gap-2 text-cyan-400 bg-cyan-400/10 border border-cyan-400/20 px-4 py-1.5 rounded-full text-xs font-semibold w-full tracking-wider uppercase">
                          <CheckCircle className="w-3 h-3" /> Selected
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2 text-rose-400 bg-rose-400/10 border border-rose-400/20 px-4 py-1.5 rounded-full text-xs font-semibold w-full tracking-wider uppercase">
                          <XCircle className="w-3 h-3" /> Rejected
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
