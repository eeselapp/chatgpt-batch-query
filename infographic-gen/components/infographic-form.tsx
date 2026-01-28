"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface InfographicFormProps {
  onSubmit: (topic: string, maxIterations: number) => void;
  isGenerating: boolean;
}

export function InfographicForm({ onSubmit, isGenerating }: InfographicFormProps) {
  const [topic, setTopic] = useState("");
  const [iterations, setIterations] = useState<number | "">(3);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Ensure iterations is within valid range
    let validIterations = typeof iterations === "number" ? iterations : 1;
    if (validIterations < 1) validIterations = 1;
    if (validIterations > 10) validIterations = 10;
    
    if (topic.trim() && validIterations > 0 && validIterations <= 10) {
      onSubmit(topic, validIterations);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="shadow-lg border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Generate Infographic
          </CardTitle>
          <CardDescription>
            Enter your topic and let AI create a stunning infographic through iterative refinement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Topic Input */}
            <div className="space-y-2">
              <label htmlFor="topic" className="text-sm font-medium">
                Topic
              </label>
              <Textarea
                id="topic"
                placeholder="e.g., How Coffee Machines Work"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                disabled={isGenerating}
                className="min-h-[100px] resize-none"
                required
              />
              <p className="text-xs text-muted-foreground">
                Be specific about what you want to visualize
              </p>
            </div>

            {/* Iterations Input */}
            <div className="space-y-2">
              <label htmlFor="iterations" className="text-sm font-medium">
                Refinement Loops <span className="text-xs text-muted-foreground font-normal">(Max: 10)</span>
              </label>
              <div className="flex items-center gap-4">
                <Input
                  id="iterations"
                  type="number"
                  min={1}
                  max={10}
                  value={iterations}
                  onChange={(e) => {
                    // Allow user to type freely, including empty string
                    const value = e.target.value;
                    if (value === "") {
                      setIterations("" as any); // Allow empty temporarily
                    } else {
                      setIterations(Number(value));
                    }
                  }}
                  onFocus={(e) => {
                    // Auto-select all text on focus for easy editing
                    e.target.select();
                  }}
                  onBlur={(e) => {
                    // Validate only on blur
                    let value = Number(e.target.value);
                    if (isNaN(value) || value < 1 || e.target.value === "") {
                      value = 1;
                    } else if (value > 10) {
                      value = 10;
                    }
                    setIterations(value);
                  }}
                  disabled={isGenerating}
                  className="w-24"
                  required
                />
                <div className="flex-1">
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={iterations || 1}
                    onChange={(e) => setIterations(Number(e.target.value))}
                    disabled={isGenerating}
                    className="w-full"
                  />
                </div>
                <span className="text-sm text-muted-foreground min-w-[60px]">
                  {iterations || 1} {(iterations === 1 || iterations === "") ? "loop" : "loops"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                More loops = higher quality (but takes longer). Maximum 10 loops.
              </p>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              size="lg"
              disabled={isGenerating || !topic.trim()}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Infographic
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}

