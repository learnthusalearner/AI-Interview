"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, ArrowLeft, Trophy, Search, Check, X, Mail, MessageSquare, Skull } from "lucide-react";
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
      
      const candidatesList = data.data || [];
      const counts: Record<string, number> = {};
      
      const enhancedList = [...candidatesList]
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .map(c => {
           const key = c.candidateEmail || c.candidateName;
           counts[key] = (counts[key] || 0) + 1;
           return { ...c, attemptNumber: counts[key] };
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
      setCandidates(enhancedList);
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
              <div className="mx-auto w-12 h-12 bg-gradient-to-tr from-violet-500/10 to-cyan-500/10 rounded-full flex items-center justify-center border border-white/10">
                <Shield className="w-6 h-6 text-cyan-400" />
              </div>
              <CardTitle className="text-white text-2xl font-bold tracking-tight">Lumina Command</CardTitle>
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
          <div className="overflow-x-auto rounded-xl border border-white/5 bg-black/40 backdrop-blur-md shadow-2xl">
            <table className="w-full text-left text-sm text-zinc-300">
              <thead className="bg-zinc-950/50 text-zinc-400 text-xs uppercase tracking-widest border-b border-white/5">
                <tr>
                  <th className="px-6 py-5 font-semibold">Candidate Profile</th>
                  <th className="px-6 py-5 font-semibold text-center">Misconduct</th>
                  <th className="px-6 py-5 font-semibold">Analytics: Strong Points</th>
                  <th className="px-6 py-5 font-semibold">Analytics: Weak Points</th>
                  <th className="px-6 py-5 font-semibold text-center">AI Total Score</th>
                  <th className="px-6 py-5 font-semibold text-center">Status</th>
                  <th className="px-6 py-5 font-semibold text-right">Decisions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {candidates.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-zinc-500">
                      Archive is empty. No completed evaluations.
                    </td>
                  </tr>
                )}
                {candidates.map((c, idx) => {
                  const analytics = getAnalytics(c.evaluationData);
                  const isFlagged = c.evaluationData?.overallRecommendation === 'FLAGGED';
                  return (
                    <motion.tr 
                      key={c.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      className={isFlagged ? "bg-amber-950/20 hover:bg-amber-950/30 border-l-2 border-amber-500 transition-colors relative" : "hover:bg-zinc-800/30 transition-colors"}
                    >
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-white flex items-center gap-2">
                          {c.candidateName} 
                          {c.attemptNumber > 1 && (
                            <span className="text-teal-400 font-mono text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-teal-500/10 border border-teal-500/20 rounded ml-1">
                              #{c.attemptNumber}
                            </span>
                          )}
                          {isFlagged && <span className="text-amber-500 text-xs font-bold px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded">⚠️ FLAGGED</span>}
                        </div>
                        <div className="text-xs text-zinc-500 mt-1 flex flex-col gap-1">
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {c.candidateEmail || "No Email"}
                          </span>
                          <span className="text-[10px] text-zinc-600 font-mono">ID: {c.id.split('-')[0]}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                         {c.cheatCount > 0 ? (
                            <span className="text-amber-500 font-bold bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.1)]">{c.cheatCount}</span>
                         ) : (
                            <span className="text-emerald-500/50 font-medium bg-emerald-500/5 px-3 py-1 rounded-full border border-emerald-500/10">0</span>
                         )}
                      </td>
                      <td className="px-6 py-5 text-cyan-400 font-medium capitalize">{analytics.strong}</td>
                      <td className="px-6 py-5 text-rose-400 font-medium capitalize">{analytics.weak}</td>
                      <td className="px-6 py-5 text-center">
                         <span className="bg-violet-500/10 border border-violet-500/20 text-violet-300 px-3 py-1 rounded-full font-mono shadow-[0_0_10px_rgba(139,92,246,0.1)]">
                           {c.totalScore || 0}/60
                         </span>
                      </td>
                      <td className="px-6 py-5 text-center">
                         {c.status === 'IN_PROGRESS' ? (
                           <span className="text-zinc-500 bg-zinc-500/10 border border-zinc-500/20 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-[0.2em] shadow-[0_0_10px_rgba(113,113,122,0.1)]">INCOMPLETE</span>
                         ) : c.applicationStatus === 'PENDING' ? (
                           <span className="text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-2 py-1 rounded text-xs font-semibold uppercase tracking-wider">PENDING</span>
                         ) : c.applicationStatus === 'ACCEPTED' ? (
                           <span className="text-cyan-400 bg-cyan-400/10 border border-cyan-400/20 px-2 py-1 rounded text-xs font-semibold uppercase tracking-wider">SELECTED</span>
                         ) : isFlagged ? (
                           <span className="text-amber-500 bg-black border border-amber-500/50 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-[0.2em] shadow-[0_0_10px_rgba(245,158,11,0.2)]">FLAGGED</span>
                         ) : (
                           <span className="text-rose-400 bg-rose-400/10 border border-rose-400/20 px-2 py-1 rounded text-xs font-semibold uppercase tracking-wider">REJECTED</span>
                         )}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <Button 
                          size="sm" 
                          variant="secondary"
                          onClick={() => setSelectedCandidate(c)}
                          className="bg-zinc-800/80 text-cyan-300 border border-cyan-500/20 hover:bg-cyan-500 hover:text-black transition-all shadow-[0_0_15px_rgba(34,211,238,0.1)]"
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
                className={selectedCandidate.evaluationData?.overallRecommendation === 'FLAGGED' ? "bg-black border border-amber-900 w-full max-w-6xl h-[85vh] rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.1)] flex flex-col overflow-hidden relative" : "bg-zinc-950 border border-zinc-800 w-full max-w-6xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden relative"}
              >
                {/* Modal Header */}
                <div className={selectedCandidate.evaluationData?.overallRecommendation === 'FLAGGED' ? "flex justify-between items-center p-6 border-b border-amber-900 bg-amber-950/10" : "flex justify-between items-center p-6 border-b border-zinc-800 bg-zinc-900/50"}>
                  <div>
                    <h2 className={selectedCandidate.evaluationData?.overallRecommendation === 'FLAGGED' ? "text-2xl font-bold text-amber-500 flex items-center gap-2" : "text-2xl font-bold text-white flex items-center gap-2"}>
                       {selectedCandidate.candidateName} <span className="text-zinc-500 text-sm font-normal">({selectedCandidate.candidateEmail || 'No Email'})</span>
                       {selectedCandidate.evaluationData?.overallRecommendation === 'FLAGGED' && <span className="text-sm border border-amber-500/30 px-2 py-0.5 rounded text-amber-500 bg-amber-500/10 ml-2">⚠️ PROCTOR WARNING</span>}
                    </h2>
                    <div className="flex gap-4 mt-2">
                      <span className={selectedCandidate.evaluationData?.overallRecommendation === 'FLAGGED' ? "text-sm px-2 py-1 bg-zinc-800 text-amber-500 rounded-md font-mono line-through" : "text-sm px-2 py-1 bg-zinc-800 text-teal-400 rounded-md font-mono"}>
                        AI Score: {selectedCandidate.totalScore}/60
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
                      
                      {/* CSS 3D Isometric Chart - Lumina Colors */}
                      <div className="flex-1 flex items-center justify-center -mt-10 overflow-visible relative">
                        <div className="w-[300px] h-[300px] [transform:rotateX(60deg)_rotateZ(-45deg)] [transform-style:preserve-3d] flex items-end justify-between gap-6">
                           {[
                             { label: 'Clarity', val: selectedCandidate.evaluationData?.clarity?.score || 0, color: '#06b6d4', dark: '#0891b2', top: '#67e8f9' },
                             { label: 'Simplicity', val: selectedCandidate.evaluationData?.simplicity?.score || 0, color: '#3b82f6', dark: '#2563eb', top: '#93c5fd' },
                             { label: 'Patience', val: selectedCandidate.evaluationData?.patience?.score || 0, color: '#8b5cf6', dark: '#7c3aed', top: '#c4b5fd' },
                             { label: 'Warmth', val: selectedCandidate.evaluationData?.warmth?.score || 0, color: '#ec4899', dark: '#db2777', top: '#f9a8d4' },
                             { label: 'Fluency', val: selectedCandidate.evaluationData?.fluency?.score || 0, color: '#10b981', dark: '#059669', top: '#6ee7b7' },
                             { label: 'Engagement', val: selectedCandidate.evaluationData?.engagement?.score || 0, color: '#f59e0b', dark: '#d97706', top: '#fcd34d' }
                           ].map((m, i) => (
                             <motion.div 
                               key={m.label}
                               initial={{ height: 0 }}
                               animate={{ height: `${Math.max(m.val * 10, 5)}%` }}
                               transition={{ delay: 0.2 + (i * 0.1), duration: 1, type: 'spring' }}
                               className="w-10 sm:w-12 relative [transform-style:preserve-3d] group hover:z-50 transition-all font-mono"
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

                      {/* Deep AI Reasoning Summary & Analytics */}
                      <div className="mt-8 bg-zinc-900/60 p-5 rounded-xl border border-zinc-800 text-sm text-zinc-300 overflow-y-auto max-h-[300px] space-y-4">
                         
                         <div>
                           <h4 className="font-medium text-white mb-2 flex items-center gap-2">
                             Evaluator Recommendation: 
                             <span className={`px-2 py-0.5 rounded text-xs font-bold ${selectedCandidate.overallRecommendation === 'PASS' ? 'bg-teal-500/20 text-teal-400' : 'bg-rose-500/20 text-rose-400'}`}>
                               {selectedCandidate.overallRecommendation || 'N/A'}
                             </span>
                             {selectedCandidate.evaluationData?.teachingStyle && (
                               <span className="px-2 py-0.5 rounded text-xs font-bold bg-violet-500/20 text-violet-400 ml-auto capitalize border border-violet-500/30">
                                 Style: {selectedCandidate.evaluationData.teachingStyle}
                               </span>
                             )}
                           </h4>
                         </div>

                         {selectedCandidate.evaluationData?.proctoringSummary && (selectedCandidate.evaluationData.proctoringSummary.mobilePhoneCount > 0 || selectedCandidate.evaluationData.proctoringSummary.absenceCount > 0) && (
                           <div className="bg-amber-950/30 border border-amber-900/50 rounded-lg p-3">
                             <h5 className="text-amber-500 font-semibold mb-1 text-xs uppercase tracking-wider flex items-center gap-1"><Skull className="w-3 h-3" /> Proctoring Violations (Cheating Attempts)</h5>
                             <ul className="list-disc pl-4 space-y-1">
                               {selectedCandidate.evaluationData.proctoringSummary.mobilePhoneCount > 0 && (
                                 <li className="text-amber-200/80 text-xs font-bold">Unauthorized Device / Smartphone Caught: <span className="text-rose-400">{selectedCandidate.evaluationData.proctoringSummary.mobilePhoneCount} time(s)</span></li>
                               )}
                               {selectedCandidate.evaluationData.proctoringSummary.absenceCount > 0 && (
                                 <li className="text-amber-200/80 text-xs font-bold">Candidate Walked Away / Not Visible: <span className="text-rose-400">{selectedCandidate.evaluationData.proctoringSummary.absenceCount} time(s)</span></li>
                               )}
                             </ul>
                           </div>
                         )}

                         {selectedCandidate.evaluationData?.riskFlags && selectedCandidate.evaluationData.riskFlags.length > 0 && selectedCandidate.evaluationData.riskFlags[0] !== "none" && (
                           <div className="bg-rose-950/30 border border-rose-900/50 rounded-lg p-3">
                             <h5 className="text-rose-400 font-semibold mb-1 text-xs uppercase tracking-wider">Risk Flags Detected</h5>
                             <div className="flex flex-wrap gap-2">
                               {selectedCandidate.evaluationData.riskFlags.map((flag: string, i: number) => (
                                 <span key={i} className="px-2 py-1 bg-rose-500/10 border border-rose-500/20 rounded text-rose-300 text-xs">⚠️ {flag}</span>
                               ))}
                             </div>
                           </div>
                         )}

                         {selectedCandidate.evaluationData?.keyHighlights && selectedCandidate.evaluationData.keyHighlights.length > 0 && (
                           <div className="bg-teal-950/30 border border-teal-900/50 rounded-lg p-3">
                             <h5 className="text-teal-400 font-semibold mb-1 text-xs uppercase tracking-wider">Key Highlights</h5>
                             <ul className="list-disc pl-4 space-y-1">
                               {selectedCandidate.evaluationData.keyHighlights.map((hl: string, i: number) => (
                                 <li key={i} className="text-teal-200/80 text-xs">{hl}</li>
                               ))}
                             </ul>
                           </div>
                         )}

                         {selectedCandidate.evaluationData?.communicationStyleAnalysis && (
                           <div className="bg-zinc-800/40 rounded-lg p-3 space-y-2">
                             <h5 className="text-zinc-400 font-semibold text-xs uppercase tracking-wider">Communication DNA</h5>
                             <p className="text-zinc-300 text-xs"><span className="font-medium text-white">Structure:</span> {selectedCandidate.evaluationData.communicationStyleAnalysis.structure}</p>
                             <div className="flex gap-4 text-xs font-mono">
                               <span className={selectedCandidate.evaluationData.communicationStyleAnalysis.examplesUsed ? "text-emerald-400" : "text-rose-400"}>
                                 {selectedCandidate.evaluationData.communicationStyleAnalysis.examplesUsed ? "✓ Uses Examples" : "✗ No Examples"}
                               </span>
                               <span className={selectedCandidate.evaluationData.communicationStyleAnalysis.stepByStep ? "text-emerald-400" : "text-rose-400"}>
                                 {selectedCandidate.evaluationData.communicationStyleAnalysis.stepByStep ? "✓ Step-by-Step" : "✗ Lacks Step-by-Step"}
                               </span>
                             </div>
                           </div>
                         )}

                         {selectedCandidate.evaluationData?.consistencyAnalysis && (
                           <div>
                             <h5 className="text-zinc-500 font-semibold mb-1 text-xs uppercase tracking-wider">Consistency Analysis</h5>
                             <p className="italic text-zinc-400 select-text leading-relaxed text-xs">
                               "{selectedCandidate.evaluationData.consistencyAnalysis}"
                             </p>
                           </div>
                         )}

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
                               <div className={`max-w-[85%] rounded-3xl p-4 shadow-xl backdrop-blur-md border ${msg.role === 'user' ? 'bg-black/60 text-zinc-200 rounded-tr-sm border-white/5' : 'bg-gradient-to-tr from-violet-900/40 to-cyan-900/40 text-cyan-50 rounded-tl-sm border-white/10'}`}>
                                  <p className="text-xs font-bold mb-2 opacity-60 uppercase tracking-widest">{msg.role === 'user' ? selectedCandidate.candidateName : 'Lumina Core'}</p>
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
