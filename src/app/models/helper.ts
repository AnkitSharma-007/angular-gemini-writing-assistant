export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  requestCount: number;
}

export interface AISuggestion {
  id: string;
  text: string;
  originalText?: string;
}

export type JSONSchema = {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  properties?: Record<string, JSONSchema>;
  items?: JSONSchema;
  required?: string[];
  additionalProperties?: boolean | JSONSchema;
  [k: string]: unknown;
};

export interface GenerationConfig {
  temperature?: number;
  topK?: number;
  topP?: number;
  maxOutputTokens?: number;
  thinkingConfig?: {
    // for Gemini 2.5
    //thinkingBudget?: number;

    // for Gemini 3
    thinkingLevel?: string;
  };
  // Gemini options to enforce JSON-only responses and schema hints
  responseMimeType?: string;
  responseSchema?: JSONSchema;
}

export interface GeminiRequest {
  contents: Array<{
    parts: Array<{
      text: string;
    }>;
  }>;
  generationConfig?: GenerationConfig;
}

export interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
    finishReason: string;
    index: number;
  }>;
  usageMetadata?: {
    promptTokenCount: number; // input tokens
    candidatesTokenCount: number; // output tokens
    totalTokenCount: number; // total tokens
  };
}

export interface UserSettings {
  autoSuggestions: boolean;
  geminiApiKey?: string;
}

// Status model for AI operations
export type AIStatus =
  | { kind: 'ok'; message?: string }
  | { kind: 'noApiKey'; message?: string }
  | { kind: 'invalidApiKey'; message?: string }
  | { kind: 'rateLimited'; message?: string }
  | { kind: 'error'; message?: string };
