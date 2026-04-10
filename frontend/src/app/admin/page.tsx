"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, ArrowLeft, Trophy, Search, Check, X, Mail, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import axios from "axios";
import { updateApplicationStatusAPI } from "@/services/api";

export default function AdminPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [candidates, setCandidates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<any | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "Cuemath") {
      setIsAuthenticated(true);
      fetchCandidates();
      toast.success("Welcome, Admin");
    } else {
      toast.error("Invalid Secret Key");
    }
  };

  const fetchCandidates = async () => {
    setIsLoading(true);
    try {
      const { data } = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || ''}/admin/candidates`);
      setCandidates(data.data || []);
    } catch (error) {
      toast.error("Failed to fetch candidates from server.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: "ACCEPTED" | "REJECTED") => {
    setActionLoadingId(id);
    try {
      await updateApplicationStatusAPI(id, status);
      toast.success(`Candidate marked as ${status}. Email dispatched.`);
      
      // Update local state smoothly without reloading table
      setCandidates(prev => prev.map(c => c.id === id ? { ...c, applicationStatus: status } : c));
      if (selectedCandidate?.id === id) {
        setSelectedCandidate((prev: any) => ({ ...prev, applicationStatus: status }));
      }
    } catch (error) {
      toast.error("Failed to update status and send email");
    } finally {
      setActionLoadingId(null);
    }
  };

  const getAnalytics = (evalData: any) => {
    if (!evalData) return { strong: [], weak: [] };
    const metrics = ["clarity", "simplicity", "patience", "warmth", "fluency"];
    const strong: string[] = [];
    const weak: string[] = [];

    metrics.forEach((m) => {
      if (evalData[m] && evalData[m].score >= 8) strong.push(m);
      if (evalData[m] && evalData[m].score <= 5) weak.push(m);
    });

    return { 
       strong: strong.length ? strong.join(", ") : "None highlighted", 
       weak: weak.length ? weak.join(", ") : "None highlighted" 
    };
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <Card className="w-full max-w-sm bg-zinc-900 border-zinc-800">
            <CardHeader className="text-center space-y-2">
              <div className="mx-auto w-12 h-12 bg-white/5 rounded-full flex items-center justify-center">
                <Shield className="w-6 h-6 text-teal-500" />
              </div>
              <CardTitle className="text-white">Admin Hub</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <input
                  type="password"
                  placeholder="Enter Secret Key"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-black border border-zinc-800 rounded-lg text-white"
                />
                <Button className="w-full bg-teal-500 text-black hover:bg-teal-400">
                  Verify Access
                </Button>
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="w-full text-zinc-500 hover:text-white"
                  onClick={() => router.push("/")}
                >
                  Return Home
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black py-12 px-4 sm:px-6 lg:px-8 overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800 shadow-xl">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Trophy className="w-8 h-8 text-yellow-500" />
              Candidate Logistics & Analytics
            </h1>
            <p className="text-zinc-400 mt-1">Review applicant metrics and finalize decisions</p>
          </div>
          <Button variant="outline" onClick={() => router.push("/")} className="border-zinc-700 text-white hover:bg-zinc-800">
            <ArrowLeft className="w-4 h-4 mr-2" /> Exit Hub
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-20 text-teal-500 animate-pulse font-semibold">Loading Applicant Data...</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/40">
            <table className="w-full text-left text-sm text-zinc-400">
              <thead className="bg-black text-white text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-medium">Candidate Profile</th>
                  <th className="px-6 py-4 font-medium">Analytics: Strong Points</th>
                  <th className="px-6 py-4 font-medium">Analytics: Weak Points</th>
                  <th className="px-6 py-4 font-medium text-center">AI Total Score</th>
                  <th className="px-6 py-4 font-medium text-center">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Decisions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {candidates.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                      Archive is empty. No completed evaluations.
                    </td>
                  </tr>
                )}
                {candidates.map((c, idx) => {
                  const analytics = getAnalytics(c.evaluationData);
                  return (
                    <motion.tr 
                      key={c.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      className="hover:bg-zinc-800/30 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-white">{c.candidateName}</div>
                        <div className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {c.candidateEmail || "No Email"}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-emerald-400 font-medium capitalize">{analytics.strong}</td>
                      <td className="px-6 py-4 text-rose-400 font-medium capitalize">{analytics.weak}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="bg-zinc-800 text-teal-400 px-3 py-1 rounded-full font-mono">
                           {c.totalScore}/50
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                         {c.applicationStatus === 'PENDING' ? (
                           <span className="text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded text-xs font-semibold">PENDING</span>
                         ) : c.applicationStatus === 'ACCEPTED' ? (
                           <span className="text-teal-500 bg-teal-500/10 px-2 py-1 rounded text-xs font-semibold">SELECTED</span>
                         ) : (
                           <span className="text-rose-500 bg-rose-500/10 px-2 py-1 rounded text-xs font-semibold">REJECTED</span>
                         )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button 
                          size="sm" 
                          variant="secondary"
                          onClick={() => setSelectedCandidate(c)}
                          className="bg-zinc-800 text-teal-400 hover:bg-teal-500 hover:text-black transition-all"
                        >
                          Deep Evaluate
                        </Button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 3D Deep Evaluation Modal Overlay */}
        <AnimatePresence>
          {selectedCandidate && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="bg-zinc-950 border border-zinc-800 w-full max-w-6xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden relative"
              >
                {/* Modal Header */}
                <div className="flex justify-between items-center p-6 border-b border-zinc-800 bg-zinc-900/50">
                  <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                       {selectedCandidate.candidateName} <span className="text-zinc-500 text-sm font-normal">({selectedCandidate.candidateEmail || 'No Email'})</span>
                    </h2>
                    <div className="flex gap-4 mt-2">
                      <span className="text-sm px-2 py-1 bg-zinc-800 text-teal-400 rounded-md font-mono">
                        AI Score: {selectedCandidate.totalScore}/50
                      </span>
                      <span className="text-sm px-2 py-1 bg-zinc-800 text-zinc-400 rounded-md font-mono">
                        Status: {selectedCandidate.applicationStatus}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button 
                      disabled={actionLoadingId === selectedCandidate.id || selectedCandidate.applicationStatus !== 'PENDING'}
                      onClick={() => handleStatusUpdate(selectedCandidate.id, "ACCEPTED")}
                      className="bg-emerald-500 text-black hover:bg-emerald-400"
                    >
                      {actionLoadingId === selectedCandidate.id ? "Processing..." : <Check className="w-4 h-4 mr-1" />} Select Candidate
                    </Button>
                    <Button 
                      variant="outline"
                      disabled={actionLoadingId === selectedCandidate.id || selectedCandidate.applicationStatus !== 'PENDING'}
                      onClick={() => handleStatusUpdate(selectedCandidate.id, "REJECTED")}
                      className="border-rose-500/30 text-rose-500 hover:bg-rose-500/10"
                    >
                      <X className="w-4 h-4 mr-1" /> Reject Candidate
                    </Button>
                    <button onClick={() => setSelectedCandidate(null)} className="p-2 ml-4 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-full transition-colors">
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                {/* Modal Body: Two Columns */}
                <div className="flex flex-1 overflow-hidden">
                   
                   {/* Column 1: 3D Visualization */}
                   <div className="w-1/2 p-8 border-r border-zinc-800 flex flex-col bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900 to-black relative">
                      <h3 className="text-lg font-semibold text-zinc-300 mb-6 flex items-center gap-2">
                        Metrics Projection
                      </h3>
                      
                      {/* CSS 3D Isometric Chart */}
                      <div className="flex-1 flex items-center justify-center -mt-10 overflow-visible relative">
                        <div className="w-[300px] h-[300px] [transform:rotateX(60deg)_rotateZ(-45deg)] [transform-style:preserve-3d] flex items-end justify-between gap-6">
                           {[
                             { label: 'Clarity', val: selectedCandidate.evaluationData?.clarity?.score || 0, color: '#3b82f6', dark: '#1d4ed8', top: '#6aabff' },
                             { label: 'Simplicity', val: selectedCandidate.evaluationData?.simplicity?.score || 0, color: '#14b8a6', dark: '#0f766e', top: '#4de8d5' },
                             { label: 'Patience', val: selectedCandidate.evaluationData?.patience?.score || 0, color: '#a855f7', dark: '#7e22ce', top: '#d08eff' },
                             { label: 'Warmth', val: selectedCandidate.evaluationData?.warmth?.score || 0, color: '#f97316', dark: '#c2410c', top: '#ff9c54' },
                             { label: 'Fluency', val: selectedCandidate.evaluationData?.fluency?.score || 0, color: '#22c55e', dark: '#15803d', top: '#63ea92' }
                           ].map((m, i) => (
                             <motion.div 
                               key={m.label}
                               initial={{ height: 0 }}
                               animate={{ height: `${Math.max(m.val * 10, 5)}%` }}
                               transition={{ delay: 0.2 + (i * 0.1), duration: 1, type: 'spring' }}
                               className="w-12 relative [transform-style:preserve-3d] group hover:z-50 transition-all font-mono"
                             >
                               {/* Tooltip Overlay (Hidden usually) */}
                               <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-black/90 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity [transform:rotateZ(45deg)_rotateX(-60deg)_translateY(-20px)] whitespace-nowrap z-50 shadow-xl border border-zinc-700 pointer-events-none">
                                  {m.label}: {m.val}/10
                               </div>
                               
                               {/* Top Face */}
                               <div className="absolute -top-6 w-12 h-12 origin-bottom [transform:rotateX(90deg)_translateY(24px)] flex items-center justify-center" style={{ backgroundColor: m.top }}>
                                 <span className="text-black/50 [transform:rotateZ(45deg)] font-bold text-sm select-none">{m.val}</span>
                               </div>
                               {/* Front Face */}
                               <div className="absolute inset-0 w-12 h-full border-b border-black/20" style={{ backgroundColor: m.color }} />
                               {/* Right Face */}
                               <div className="absolute top-0 -right-6 w-6 h-full origin-left [transform:rotateY(90deg)_translateZ(24px)] border-l border-black/20" style={{ backgroundColor: m.dark }} />
                               
                               {/* Ground Shadow */}
                               <div className="absolute -bottom-2 -left-2 w-16 h-12 bg-black/60 blur-md rounded-full [transform:translateZ(-10px)]" />
                               
                               {/* Base Label */}
                               <div className="absolute -bottom-10 left-1/2 text-zinc-400 text-xs [transform:rotateZ(45deg)_rotateX(-60deg)_translateY(20px)_translateX(-20px)] origin-top-left font-sans select-none tracking-wider">
                                 {m.label}
                               </div>
                             </motion.div>
                           ))}
                        </div>
                      </div>

                      {/* AI Reasoning Summary */}
                      <div className="mt-8 bg-zinc-900/60 p-5 rounded-xl border border-zinc-800 text-sm text-zinc-300">
                         <h4 className="font-medium text-white mb-2">Evaluator Notes:</h4>
                         <p className="italic text-zinc-400 select-text leading-relaxed">
                           "The candidate scored well structurally. Recommendation: <span className="text-teal-400 not-italic uppercase font-semibold">{selectedCandidate.overallRecommendation || 'N/A'}</span>. Their highest trait was observed in warmth and patience."
                         </p>
                      </div>
                   </div>

                   {/* Column 2: Verbatim Transcript */}
                   <div className="w-1/2 flex flex-col bg-black">
                     <div className="p-4 border-b border-zinc-800 bg-zinc-900/40">
                        <h3 className="text-zinc-300 font-medium flex items-center gap-2">
                           <MessageSquare className="w-4 h-4" /> Live Verbatim Transcript
                        </h3>
                     </div>
                     <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {(!selectedCandidate.messages || selectedCandidate.messages.length === 0) ? (
                          <div className="text-center text-zinc-500 py-10">No transcript available.</div>
                        ) : (
                          selectedCandidate.messages.map((msg: any, i: number) => (
                            <div key={i} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                               <div className={`max-w-[85%] rounded-2xl p-4 ${msg.role === 'user' ? 'bg-zinc-800 text-zinc-200 rounded-tr-sm border border-zinc-700 shadow-lg' : 'bg-teal-950/40 text-teal-100 rounded-tl-sm border border-teal-900/50 shadow-lg'}`}>
                                  <p className="text-xs font-semibold mb-2 opacity-50 uppercase tracking-widest">{msg.role === 'user' ? selectedCandidate.candidateName : 'Alpha AI'}</p>
                                  <p className="text-sm leading-relaxed">{msg.content}</p>
                               </div>
                            </div>
                          ))
                        )}
                     </div>
                   </div>

                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
