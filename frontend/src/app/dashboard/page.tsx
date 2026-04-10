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
    <div className="min-h-screen bg-black py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex justify-between items-center bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Applicant Dashboard</h1>
            <p className="text-zinc-400 mt-1">Track your AI Interview applications</p>
          </div>
          <Button variant="outline" onClick={() => router.push("/")} className="border-zinc-700 text-white hover:bg-zinc-800">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-20 text-zinc-500">Loading your applications...</div>
        ) : (
          <div className="space-y-4">
            {sessions.length === 0 ? (
              <div className="text-center py-10 bg-zinc-900/30 rounded-xl border border-dashed border-zinc-800 text-zinc-500">
                You haven't completed any interviews yet.
              </div>
            ) : (
              sessions.map((session, idx) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col md:flex-row justify-between items-center gap-4 hover:border-zinc-700 transition-colors"
                >
                  <div>
                    <h3 className="text-xl font-medium text-white">Application #{session.id.slice(0, 8)}</h3>
                    <p className="text-sm text-zinc-500">Date: {new Date(session.createdAt).toLocaleDateString()}</p>
                  </div>
                  
                    <div className="flex items-center gap-4">

                    <div className="w-32 flex flex-col items-center">
                      <p className="text-xs text-zinc-400 uppercase tracking-wider mb-1">Status</p>
                      {session.applicationStatus === 'PENDING' ? (
                        <div className="flex items-center gap-2 text-yellow-500 bg-yellow-500/10 px-3 py-1 rounded-full text-sm font-medium">
                          <Clock className="w-4 h-4" /> Pending
                        </div>
                      ) : session.applicationStatus === 'ACCEPTED' ? (
                        <div className="flex items-center gap-2 text-teal-500 bg-teal-500/10 px-3 py-1 rounded-full text-sm font-medium">
                          <CheckCircle className="w-4 h-4" /> Accepted
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-rose-500 bg-rose-500/10 px-3 py-1 rounded-full text-sm font-medium">
                          <XCircle className="w-4 h-4" /> Rejected
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
