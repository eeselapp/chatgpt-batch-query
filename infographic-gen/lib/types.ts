export type GenerationStatus = 'idle' | 'drafting' | 'critiquing' | 'refining' | 'done' | 'error';

export interface InfographicVersion {
  version: number;
  imageBase64: string;
  prompt: string;
  timestamp: Date;
  critiques?: CritiquePoint[]; // Critique specific to this version
}

export interface CritiquePoint {
  title: string;
  description: string;
}

export interface GenerationState {
  status: GenerationStatus;
  currentVersion: number;
  maxIterations: number;
  versions: InfographicVersion[];
  currentStep: string;
  error?: string;
}

export interface GenerateInfographicRequest {
  topic: string;
  maxIterations: number;
}

export interface GenerateInfographicResponse {
  success: boolean;
  version: number;
  imageBase64?: string;
  critiques?: CritiquePoint[];
  newPrompt?: string;
  error?: string;
}
