"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useInterviewStore } from "@/lib/store";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BadgeCheck, Quote, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function EvaluationPage() {
  const router = useRouter();
  const { evaluation, candidateName, reset } = useInterviewStore();

  useEffect(() => {
    if (!evaluation) {
      router.replace("/");
    }
  }, [evaluation, router]);

  if (!evaluation) return null;

  const getScoreColor = (score: number) => {
    if (score >= 8) return "bg-teal-500";
    if (score >= 5) return "bg-amber-500";
    return "bg-rose-500";
  };

  const attributes = [
    { label: "Clarity", data: evaluation.clarity },
    { label: "Warmth", data: evaluation.warmth },
    { label: "Patience", data: evaluation.patience },
    { label: "Simplicity", data: evaluation.simplicity },
    { label: "Fluency", data: evaluation.fluency },
  ];

  const handleRestart = () => {
    reset();
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-black py-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Decorators */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-teal-900/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-900/10 blur-[150px] rounded-full pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-4xl mx-auto space-y-8 relative z-10"
      >
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-white mb-2">
              Evaluation Report
            </h1>
            <p className="text-zinc-400">
              Candidate: <span className="text-white font-medium">{candidateName}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
             <div className={`px-4 py-2 rounded-full border text-sm font-bold tracking-wider ${
               evaluation.overallRecommendation === "PASS" 
                ? "bg-teal-500/10 border-teal-500/50 text-teal-400" 
                : "bg-rose-500/10 border-rose-500/50 text-rose-400"
             }`}>
               {evaluation.overallRecommendation}
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Attributes breakdown */}
          <div className="md:col-span-2 space-y-4">
            {attributes.map((attr, idx) => (
              <motion.div 
                key={attr.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 + 0.3 }}
              >
                <Card className="bg-zinc-900/40 border-white/5 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-white font-medium text-lg">{attr.label}</span>
                      <span className="text-zinc-400 font-mono text-xl">{attr.data.score}/10</span>
                    </div>
                    <Progress 
                       value={attr.data.score * 10} 
                       className={`h-2 mb-3 [&>div]:${getScoreColor(attr.data.score)} bg-zinc-800`}
                    />
                    <p className="text-sm text-zinc-400 leading-relaxed">
                      {attr.data.reasoning}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Evidence Quotes & Meta */}
          <div className="space-y-6">
            <motion.div
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               transition={{ delay: 0.6 }}
            >
              <Card className="bg-zinc-900/40 border-white/5 backdrop-blur-sm h-full">
                <CardHeader>
                  <CardTitle className="text-zinc-300 flex items-center gap-2">
                    <Quote className="w-5 h-5 text-teal-500" />
                    Key Quotes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {evaluation.evidenceQuotes.map((quote, i) => (
                    <div key={i} className="pl-4 border-l-2 border-teal-500/30 py-1">
                      <p className="text-sm text-zinc-300 italic">"{quote}"</p>
                    </div>
                  ))}
                  {evaluation.evidenceQuotes.length === 0 && (
                    <p className="text-sm text-zinc-500">No specific quotes captured.</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            <Button 
               onClick={handleRestart}
               variant="outline"
               className="w-full bg-transparent border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Return to Home
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
