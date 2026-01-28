/**
 * Utility functions for prompt generation
 * These are NOT Server Actions, just pure functions
 */

/**
 * Generate initial structured prompt for infographic generation
 * Simple and direct - let AI handle the details
 */
export function generateInitialPrompt(topic: string): string {
  return `Create an infographic about: ${topic}`;
}

/**
 * Generate refined prompt based on critique feedback
 */
export function generateRefinedPrompt(
  originalPrompt: string,
  critiques: string[]
): string {
  const improvements = critiques.join(", ");
  return `${originalPrompt}\n\nIMPROVEMENTS NEEDED: ${improvements}`;
}

