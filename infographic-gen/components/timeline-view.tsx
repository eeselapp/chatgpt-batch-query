"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, ArrowRight, Brain, Sparkles, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { InfographicVersion } from "@/lib/types";
import Image from "next/image";

interface TimelineViewProps {
  versions: InfographicVersion[];
  isGenerating: boolean;
  currentVersion: number;
  maxIterations?: number; // Add to know which is truly final
}

export function TimelineView({ versions, isGenerating, currentVersion, maxIterations }: TimelineViewProps) {
  const downloadImage = (base64: string, version: number) => {
    const link = document.createElement("a");
    link.href = `data:image/png;base64,${base64}`;
    link.download = `infographic-v${version}.png`;
    link.click();
  };

  if (versions.length === 0 && !isGenerating) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="space-y-4"
    >
      <Card className="shadow-lg border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-500" />
            Generation Timeline
            {versions.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {versions.length} {versions.length === 1 ? "version" : "versions"}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Timeline Container */}
          <div className="space-y-6">
            {versions.map((version, idx) => {
              const isFirst = idx === 0;
              // Use maxIterations to determine if truly final, not array position
              const isFinal = maxIterations ? version.version === maxIterations : false;
              const isCurrent = version.version === currentVersion && isGenerating;
              const isLast = idx === versions.length - 1;
              const isSingleVersion = maxIterations === 1; // Special case: only 1 loop

              return (
                <motion.div
                  key={version.version}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="relative"
                >
                  {/* Timeline Line */}
                  {!isLast && (
                    <div className="absolute left-[23px] top-[60px] bottom-[-24px] w-0.5 bg-gradient-to-b from-blue-500 to-purple-500" />
                  )}

                  {/* Timeline Item */}
                  <div className="flex gap-6">
                    {/* Version Badge + Connector */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`
                          w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm z-10
                          ${isSingleVersion ? "bg-green-500 text-white" : ""}
                          ${!isSingleVersion && isFirst ? "bg-blue-500 text-white" : ""}
                          ${!isSingleVersion && isFinal && !isCurrent ? "bg-green-500 text-white" : ""}
                          ${!isSingleVersion && !isFirst && !isFinal ? "bg-purple-500 text-white" : ""}
                          ${isCurrent ? "bg-amber-500 text-white animate-pulse" : ""}
                        `}
                      >
                        V{version.version}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 pb-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Image Card */}
                        <Card className={`${isFinal ? "border-green-300 shadow-green-100" : ""}`}>
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {isSingleVersion && (
                                  <>
                                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                                    <span className="font-semibold text-green-700">Final</span>
                                  </>
                                )}
                                {!isSingleVersion && isFirst && (
                                  <>
                                    <Sparkles className="w-4 h-4 text-blue-500" />
                                    <span className="font-semibold">Draft</span>
                                  </>
                                )}
                                {!isSingleVersion && isFinal && (
                                  <>
                                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                                    <span className="font-semibold text-green-700">Final</span>
                                  </>
                                )}
                                {!isSingleVersion && !isFirst && !isFinal && (
                                  <>
                                    <ArrowRight className="w-4 h-4 text-purple-500" />
                                    <span className="font-semibold">Refined</span>
                                  </>
                                )}
                              </div>
                              <Badge variant={isFinal || isSingleVersion ? "default" : "secondary"}>
                                Version {version.version}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-slate-100">
                              <Image
                                src={`data:image/png;base64,${version.imageBase64}`}
                                alt={`Version ${version.version}`}
                                fill
                                className="object-contain"
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={() => downloadImage(version.imageBase64, version.version)}
                              >
                                <Download className="w-4 h-4" />
                                Download
                              </Button>
                              <span className="text-xs text-muted-foreground self-center">
                                {new Date(version.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Critique Card */}
                        {version.critiques && version.critiques.length > 0 && (
                          <Card className="border-purple-200 bg-purple-50/30">
                            <CardHeader>
                              <div className="flex items-center gap-2">
                                <Brain className="w-4 h-4 text-purple-500" />
                                <span className="font-semibold text-purple-900">
                                  AI Analysis & Improvements
                                </span>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-3">
                                {version.critiques.map((critique, cidx) => (
                                  <motion.div
                                    key={cidx}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: cidx * 0.1 }}
                                    className="p-3 rounded-lg bg-white border border-purple-200"
                                  >
                                    <h5 className="font-semibold text-sm text-purple-900 mb-1">
                                      {critique.title}
                                    </h5>
                                    <p className="text-xs text-purple-700">{critique.description}</p>
                                  </motion.div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* Loading State for Next Version */}
                        {isCurrent && isGenerating && (
                          <Card className="border-amber-200 bg-amber-50/30">
                            <CardHeader>
                              <div className="flex items-center gap-2">
                                <Brain className="w-4 h-4 text-amber-500 animate-pulse" />
                                <span className="font-semibold text-amber-900">Analyzing...</span>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-3">
                                <Skeleton className="h-16 w-full" />
                                <Skeleton className="h-16 w-full" />
                                <Skeleton className="h-16 w-full" />
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {/* Loading Next Version */}
            {isGenerating && currentVersion > versions.length && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="relative"
              >
                <div className="flex gap-6">
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm z-10 bg-amber-500 text-white animate-pulse">
                      V{currentVersion}
                    </div>
                  </div>
                  <div className="flex-1 pb-6">
                    <Card className="border-amber-200">
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          <Skeleton className="w-full aspect-square" />
                          <Skeleton className="h-10 w-full" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

