"use client";

import { toast } from "sonner";
import { InfographicForm } from "@/components/infographic-form";
import { ProcessView } from "@/components/process-view";
import { TimelineView } from "@/components/timeline-view";
import { useInfographicGenerator } from "@/lib/hooks/use-infographic-generator";

export default function Home() {
  const {
    state,
    addVersion,
    updateStatus,
    initialize,
    setError,
  } = useInfographicGenerator();

  const handleGenerate = async (topic: string, maxIterations: number) => {
    try {
      // Initialize state
      initialize(maxIterations);
      toast.info("Starting generation process...");

      // Use fetch with SSE for real-time updates
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, maxIterations }),
      });

      if (!response.ok) {
        throw new Error("Failed to start generation");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response reader available");
      }

      // Buffer for incomplete messages
      let buffer = "";

      // Read stream
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Decode chunk and add to buffer
        buffer += decoder.decode(value, { stream: true });

        // Split by double newline (SSE message separator)
        const messages = buffer.split("\n\n");
        
        // Keep the last incomplete message in buffer
        buffer = messages.pop() || "";

        // Process complete messages
        for (const message of messages) {
          if (message.startsWith("data: ")) {
            try {
              const jsonString = message.slice(6).trim();
              if (jsonString) {
                const data = JSON.parse(jsonString);

                if (data.type === "status") {
                  updateStatus(data.status, data.currentVersion, data.step);
                } else if (data.type === "version") {
                  addVersion(data.version);
                  updateStatus(data.status, data.currentVersion, data.step);
                } else if (data.type === "complete") {
                  toast.success(`Successfully generated ${data.totalVersions} versions!`);
                } else if (data.type === "error") {
                  throw new Error(data.error);
                }
              }
            } catch (parseError) {
              console.warn("Failed to parse SSE message:", message.slice(0, 100));
              // Continue processing other messages
            }
          }
        }
      }

    } catch (error) {
      console.error("Generation error:", error);
      setError(error instanceof Error ? error.message : "Unknown error");
      toast.error("Failed to generate infographic. Please try again.");
    }
  };

  const isGenerating = ["drafting", "critiquing", "refining"].includes(state.status);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 pb-1">
            AI Infographic Generator
          </h1>
          <p className="text-muted-foreground text-lg">
            Create stunning infographics with iterative AI refinement
          </p>
        </div>

        <div className="max-w-7xl mx-auto space-y-8">
          {/* Top Section: Form and Process */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <InfographicForm
              onSubmit={handleGenerate}
              isGenerating={isGenerating}
            />
            <ProcessView
              status={state.status}
              currentStep={state.currentStep}
              currentVersion={state.currentVersion}
              maxIterations={state.maxIterations}
            />
          </div>

          {/* Timeline Section: All Versions with Critiques */}
          <TimelineView
            versions={state.versions}
            isGenerating={isGenerating}
            currentVersion={state.currentVersion}
            maxIterations={state.maxIterations}
          />
        </div>

        {/* Footer */}
        <div className="text-center mt-16 text-sm text-muted-foreground">
          <p>Powered by Google Gemini AI • Draft → Critique → Refine</p>
        </div>
      </div>
    </main>
  );
}
