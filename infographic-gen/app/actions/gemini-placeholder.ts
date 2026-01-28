"use server";

import type { CritiquePoint } from "@/lib/types";
import { generateRefinedPrompt } from "@/lib/prompts";

/**
 * Phase 3: Placeholder Implementation
 * This simulates the Gemini API calls for testing the workflow
 * Phase 6 will replace these with real API calls
 */

// Simulate delay for API calls
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Placeholder: Generate image using Gemini 3 Pro Image Preview
 * Real implementation (Phase 6): Call gemini-3-pro-image-preview
 */
export async function generateImagePlaceholder(
  prompt: string,
  version: number
): Promise<string> {
  console.log(`[Mock] Generating image V${version} with prompt:`, prompt);
  
  // Simulate API call delay (2-4 seconds)
  await delay(2000 + Math.random() * 2000);
  
  // Return placeholder base64 image (1x1 colored pixel for now)
  // Phase 6: This will return actual base64 image from Gemini
  const colors = ["#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444"];
  const color = colors[version % colors.length];
  
  // Create a simple colored square as placeholder
  const svg = `<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
    <rect width="400" height="400" fill="${color}"/>
    <text x="200" y="200" font-size="48" fill="white" text-anchor="middle" dominant-baseline="middle">
      V${version}
    </text>
    <text x="200" y="250" font-size="16" fill="white" text-anchor="middle" dominant-baseline="middle">
      ${prompt.substring(0, 30)}...
    </text>
  </svg>`;
  
  return Buffer.from(svg).toString("base64");
}

/**
 * Placeholder: Critique image using Gemini 3 Pro (Vision)
 * Real implementation (Phase 6): Call gemini-3-pro-preview with vision
 */
export async function critiqueImagePlaceholder(
  imageBase64: string,
  prompt: string,
  version: number
): Promise<{
  critiques: CritiquePoint[];
  refinedPrompt: string;
}> {
  console.log(`[Mock] Critiquing image V${version}`);
  
  // Simulate API call delay (3-5 seconds for vision analysis)
  await delay(3000 + Math.random() * 2000);
  
  // Generate mock critiques based on version
  const mockCritiques: CritiquePoint[] = [];
  
  if (version === 1) {
    mockCritiques.push(
      {
        title: "Text Legibility Issue",
        description: "The title text is too small and difficult to read. Recommend increasing font size by 50% and using bold weight.",
      },
      {
        title: "Color Contrast Problem",
        description: "Background color is too dark, reducing overall readability. Suggest using a lighter palette with higher contrast ratios.",
      },
      {
        title: "Layout Flow Unclear",
        description: "Information hierarchy is not well-defined. Main concept should be more prominent and positioned at the top.",
      }
    );
  } else if (version === 2) {
    mockCritiques.push(
      {
        title: "Improved Typography",
        description: "Title size is now appropriate. Consider adding more visual hierarchy with distinct subheading styles.",
      },
      {
        title: "Generic AI Style",
        description: "The overall aesthetic feels too generic. Recommend adopting a more distinct design style (e.g., Swiss International, Hand-drawn, or Flat Vector).",
      }
    );
  } else if (version >= 3) {
    mockCritiques.push(
      {
        title: "Minor Refinements",
        description: "Small adjustments to spacing and alignment would perfect the composition. Consider adding subtle textures for depth.",
      }
    );
  }
  
  // Generate refined prompt based on critiques
  const critiqueTitles = mockCritiques.map(c => c.title);
  const refinedPrompt = generateRefinedPrompt(prompt, critiqueTitles);
  
  return {
    critiques: mockCritiques,
    refinedPrompt,
  };
}

