import { GoogleGenAI } from "@google/genai";

if (!process.env.GOOGLE_API_KEY) {
  throw new Error("GOOGLE_API_KEY is not set in environment variables");
}

/**
 * Initialize Google GenAI client
 */
export const genAI = new GoogleGenAI({
  apiKey: process.env.GOOGLE_API_KEY,
});

/**
 * Model IDs
 */
export const MODELS = {
  IMAGE_GEN: "gemini-3-pro-image-preview",
  VISION_CRITIQUE: "gemini-3-pro-preview",
} as const;

