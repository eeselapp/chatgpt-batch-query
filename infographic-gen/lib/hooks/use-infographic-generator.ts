import { useState, useCallback } from "react";
import type { GenerationState, InfographicVersion } from "@/lib/types";

/**
 * Custom hook for managing infographic generation state with real-time updates
 */
export function useInfographicGenerator() {
  const [state, setState] = useState<GenerationState>({
    status: "idle",
    currentVersion: 0,
    maxIterations: 0,
    versions: [],
    currentStep: "Ready to generate your infographic",
  });

  /**
   * Add a new version to the timeline in real-time
   */
  const addVersion = useCallback((version: InfographicVersion) => {
    setState((prev) => ({
      ...prev,
      versions: [...prev.versions, version],
    }));
  }, []);

  /**
   * Update current status and step
   */
  const updateStatus = useCallback((
    status: GenerationState["status"],
    currentVersion: number,
    step: string
  ) => {
    setState((prev) => ({
      ...prev,
      status,
      currentVersion,
      currentStep: step,
    }));
  }, []);

  /**
   * Reset to initial state
   */
  const reset = useCallback(() => {
    setState({
      status: "idle",
      currentVersion: 0,
      maxIterations: 0,
      versions: [],
      currentStep: "Ready to generate your infographic",
    });
  }, []);

  /**
   * Initialize generation
   */
  const initialize = useCallback((maxIterations: number) => {
    setState({
      status: "drafting",
      currentVersion: 1,
      maxIterations,
      versions: [],
      currentStep: `Generating ${maxIterations} ${maxIterations === 1 ? "version" : "versions"}...`,
    });
  }, []);

  /**
   * Set error state
   */
  const setError = useCallback((error: string) => {
    setState((prev) => ({
      ...prev,
      status: "error",
      currentStep: "Failed to generate infographic",
      error,
    }));
  }, []);

  return {
    state,
    addVersion,
    updateStatus,
    reset,
    initialize,
    setError,
  };
}


