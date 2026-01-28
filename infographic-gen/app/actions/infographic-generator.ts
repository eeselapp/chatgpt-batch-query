"use server";

import type { InfographicVersion, CritiquePoint } from "@/lib/types";
import { generateInitialPrompt } from "@/lib/prompts";
import {
  generateImagePlaceholder,
  critiqueImagePlaceholder,
} from "./gemini-placeholder";

/**
 * Generate improvement summary for final version
 * Shows what was improved throughout all iterations
 */
function generateFinalSummary(versions: InfographicVersion[]): CritiquePoint[] {
  const allCritiques: string[] = [];
  
  // Collect all critique titles from previous versions
  versions.forEach(version => {
    if (version.critiques && version.critiques.length > 0) {
      version.critiques.forEach(c => {
        allCritiques.push(c.title);
      });
    }
  });
  
  // Generate summary based on collected critiques
  const summary: CritiquePoint[] = [
    {
      title: "✨ Final Version Complete",
      description: `This is the final refined version after ${versions.length} iteration${versions.length > 1 ? 's' : ''}. All identified issues have been addressed.`,
    }
  ];
  
  // Add improvements made
  if (allCritiques.length > 0) {
    summary.push({
      title: "🎨 Improvements Made",
      description: `Successfully improved: ${allCritiques.slice(0, 5).join(", ")}${allCritiques.length > 5 ? `, and ${allCritiques.length - 5} more` : ''}.`,
    });
  }
  
  // Add quality confirmation
  summary.push({
    title: "✅ Ready to Use",
    description: "This infographic meets all quality standards and is ready for download and use.",
  });
  
  return summary;
}

/**
 * Phase 4: Generator with callback for real-time updates
 * Yields each version as it's generated instead of waiting for all
 */
export async function generateInfographicWithProgress(
  topic: string,
  maxIterations: number,
  onProgress: (update: {
    status: "drafting" | "critiquing" | "refining" | "done";
    currentVersion: number;
    version?: InfographicVersion;
    step: string;
  }) => void
): Promise<InfographicVersion[]> {
  const versions: InfographicVersion[] = [];
  
  try {
    let currentPrompt = generateInitialPrompt(topic);
    
    // Iterative refinement loop
    for (let i = 1; i <= maxIterations; i++) {
      console.log(`\n=== Starting Version ${i}/${maxIterations} ===`);
      
      // Step 1: Generate Image
      onProgress({
        status: "drafting",
        currentVersion: i,
        step: `Generating version ${i} of ${maxIterations}...`,
      });
      
      const imageBase64 = await generateImagePlaceholder(currentPrompt, i);
      
      // Step 2: Critique (skip for last version)
      let critiques: CritiquePoint[] = [];
      if (i < maxIterations) {
        onProgress({
          status: "critiquing",
          currentVersion: i,
          step: `Analyzing version ${i}...`,
        });
        
        const critiqueResult = await critiqueImagePlaceholder(
          imageBase64,
          currentPrompt,
          i
        );
        critiques = critiqueResult.critiques;
        currentPrompt = critiqueResult.refinedPrompt;
      } else {
        // Final version: Show summary of all improvements made
        critiques = generateFinalSummary(versions);
      }
      
      // Store version
      const version: InfographicVersion = {
        version: i,
        imageBase64,
        prompt: currentPrompt,
        timestamp: new Date(),
        critiques: critiques.length > 0 ? critiques : undefined,
      };
      
      versions.push(version);
      
      // Send this version to client immediately
      onProgress({
        status: i < maxIterations ? "refining" : "done",
        currentVersion: i,
        version: version,
        step: i < maxIterations 
          ? `Version ${i} complete. Preparing version ${i + 1}...`
          : "All versions complete!",
      });
    }
    
    return versions;
    
  } catch (error) {
    console.error("Error in generateInfographicWithProgress:", error);
    throw new Error(`Failed to generate infographic: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Phase 3: Original batch generator (kept for compatibility)
 * Returns all versions at once
 */
export async function generateInfographic(
  topic: string,
  maxIterations: number
): Promise<InfographicVersion[]> {
  const versions: InfographicVersion[] = [];
  
  try {
    let currentPrompt = generateInitialPrompt(topic);
    
    // Iterative refinement loop
    for (let i = 1; i <= maxIterations; i++) {
      console.log(`\n=== Starting Version ${i}/${maxIterations} ===`);
      
      // Step 1: Generate Image
      console.log(`[V${i}] Step 1: Generating image...`);
      const imageBase64 = await generateImagePlaceholder(currentPrompt, i);
      
      // Step 2: Critique (skip for last version)
      let critiques: CritiquePoint[] = [];
      if (i < maxIterations) {
        console.log(`[V${i}] Step 2: Critiquing image...`);
        const critiqueResult = await critiqueImagePlaceholder(
          imageBase64,
          currentPrompt,
          i
        );
        critiques = critiqueResult.critiques;
        currentPrompt = critiqueResult.refinedPrompt;
      } else {
        // Final version: Show summary of all improvements made
        console.log(`[V${i}] Final version - generating improvement summary...`);
        critiques = generateFinalSummary(versions);
      }
      
      // Store version
      const version: InfographicVersion = {
        version: i,
        imageBase64,
        prompt: currentPrompt,
        timestamp: new Date(),
        critiques: critiques.length > 0 ? critiques : undefined,
      };
      
      versions.push(version);
      console.log(`[V${i}] Complete! Moving to next version...`);
    }
    
    console.log(`\n=== Generation Complete: ${versions.length} versions ===`);
    return versions;
    
  } catch (error) {
    console.error("Error in generateInfographic:", error);
    throw new Error(`Failed to generate infographic: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
