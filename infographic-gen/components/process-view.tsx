"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, Brain, Sparkles, AlertCircle } from "lucide-react";
import type { GenerationStatus } from "@/lib/types";

interface ProcessViewProps {
  status: GenerationStatus;
  currentStep: string;
  currentVersion: number;
  maxIterations: number;
}

const statusConfig = {
  idle: {
    icon: Sparkles,
    color: "text-slate-500",
    bgColor: "bg-slate-100",
    label: "Ready",
    variant: "secondary" as const,
  },
  drafting: {
    icon: Loader2,
    color: "text-blue-500",
    bgColor: "bg-blue-50",
    label: "Drafting",
    variant: "default" as const,
  },
  critiquing: {
    icon: Brain,
    color: "text-purple-500",
    bgColor: "bg-purple-50",
    label: "Analyzing",
    variant: "default" as const,
  },
  refining: {
    icon: Sparkles,
    color: "text-amber-500",
    bgColor: "bg-amber-50",
    label: "Refining",
    variant: "default" as const,
  },
  done: {
    icon: CheckCircle2,
    color: "text-green-500",
    bgColor: "bg-green-50",
    label: "Complete",
    variant: "default" as const,
  },
  error: {
    icon: AlertCircle,
    color: "text-red-500",
    bgColor: "bg-red-50",
    label: "Error",
    variant: "destructive" as const,
  },
};

export function ProcessView({ status, currentStep, currentVersion, maxIterations }: ProcessViewProps) {
  const config = statusConfig[status];
  const Icon = config.icon;
  const progress = status === "idle" ? 0 : (currentVersion / maxIterations) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <Card className="shadow-lg border-2">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Process Status</span>
            <Badge variant={config.variant} className="ml-2">
              {config.label}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Icon and Message */}
          <div className={`flex items-center gap-4 p-4 rounded-lg ${config.bgColor}`}>
            <Icon
              className={`w-8 h-8 ${config.color} ${
                status === "drafting" || status === "critiquing" || status === "refining"
                  ? "animate-spin"
                  : ""
              }`}
            />
            <div className="flex-1">
              <AnimatePresence mode="wait">
                <motion.p
                  key={currentStep}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="font-medium"
                >
                  {currentStep || "Waiting to start..."}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>

          {/* Progress Bar */}
          {status !== "idle" && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{Math.round(progress)}%</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                />
              </div>
            </div>
          )}

          {/* Iteration Steps */}
          {status !== "idle" && maxIterations > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: Math.min(maxIterations, 10) }).map((_, idx) => {
                const versionNum = idx + 1;
                const isCompleted = currentVersion > versionNum;
                const isCurrent = currentVersion === versionNum;

                return (
                  <motion.div
                    key={idx}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`
                      h-2 rounded-full transition-all
                      ${isCompleted ? "bg-green-500" : ""}
                      ${isCurrent ? "bg-blue-500 animate-pulse" : ""}
                      ${!isCompleted && !isCurrent ? "bg-slate-200" : ""}
                    `}
                  />
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

