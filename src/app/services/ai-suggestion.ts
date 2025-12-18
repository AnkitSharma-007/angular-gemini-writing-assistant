import { Injectable, signal, inject } from '@angular/core';
import {
  HttpClient,
  HttpHeaders,
  HttpParams,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, of, map, catchError, timeout } from 'rxjs';
import {
  AISuggestion,
  AIStatus,
  GeminiRequest,
  GeminiResponse,
  TokenUsage,
  JSONSchema,
} from '../models/helper';
import {
  API_BASE,
  MAX_OUTPUT_TOKENS,
  MODEL_ID,
  TIMEOUT_MS,
} from '../shared/config.tokens';
import { SUGGESTION_IDS } from '../shared/constants';

// Strict JSON schema for the model's response suggestions
const SUGGESTIONS_SCHEMA: JSONSchema = {
  type: 'object',
  properties: {
    suggestions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          originalText: { type: 'string' },
        },
        required: ['text'],
      },
    },
  },
  required: ['suggestions'],
};

@Injectable({ providedIn: 'root' })
export class AISuggestionService {
  private readonly http = inject(HttpClient);
  private readonly modelId = inject(MODEL_ID);
  private readonly apiBase = inject(API_BASE);
  private readonly timeoutMs = inject(TIMEOUT_MS);
  private readonly maxOutputTokens = inject(MAX_OUTPUT_TOKENS);

  private get apiUrl() {
    const path = `models/${this.modelId}:generateContent`;
    return `${this.apiBase}/${path}`;
  }

  private readonly defaultApiKey = '';
  private apiKey = this.defaultApiKey;

  private readonly tokenUsage = signal<TokenUsage>({
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    requestCount: 0,
  });
  getTokenUsage = this.tokenUsage.asReadonly();

  private readonly aiStatus = signal<AIStatus>({ kind: 'ok' });
  getAIStatus = this.aiStatus.asReadonly();

  getSuggestions(text: string): Observable<AISuggestion[]> {
    if (!this.apiKey || !this.apiKey.trim()) {
      this.aiStatus.set({
        kind: 'noApiKey',
        message:
          'No API key configured. Please add your Gemini API key in Settings.',
      });
      return of([
        {
          id: SUGGESTION_IDS.NO_API_KEY,
          text: 'No API key configured. Please go to Settings and enter your Google Gemini API key to enable grammar checking.',
        },
      ]);
    }
    if (text.trim().length < 3) return of([]);

    const prompt = this.buildGrammarPrompt(text);
    const request: GeminiRequest = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        ...AISuggestionService.defaultGenerationConfig(),
        maxOutputTokens: this.maxOutputTokens,
        responseMimeType: 'application/json',
        responseSchema: SUGGESTIONS_SCHEMA,
      },
    };

    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const params = new HttpParams().set('key', this.apiKey);

    return this.http
      .post<GeminiResponse>(this.apiUrl, request, { headers, params })
      .pipe(
        timeout(this.timeoutMs),
        map((response) => {
          this.aiStatus.set({ kind: 'ok' });
          return this.parseSuggestionsFromGemini(response);
        }),
        catchError((error) => this.handleApiError(error))
      );
  }

  private buildGrammarPrompt(text: string): string {
    return `You are an expert grammar checker. Analyze the following text and provide ONLY grammar suggestions for grammatical errors, spelling mistakes, and punctuation issues.

      Text to analyze:
      ---
      ${text}
      ---

      Return ONLY valid JSON (no code fences, no prose, no markdown).

      Guidelines:
      - Focus ONLY on grammar, spelling, and punctuation errors
      - Do NOT provide clarity, style, or completion suggestions
      - Provide 1-5 grammar corrections maximum
      - If there are no grammar errors, return an empty suggestions array
      - Include the exact original text that needs to be corrected in "originalText"`;
  }

  private parseSuggestionsFromGemini(response: GeminiResponse): AISuggestion[] {
    if (response.usageMetadata) {
      this.tokenUsage.update((usage) => ({
        inputTokens:
          usage.inputTokens + (response.usageMetadata?.promptTokenCount ?? 0),
        outputTokens:
          usage.outputTokens +
          (response.usageMetadata?.candidatesTokenCount ?? 0),
        totalTokens:
          usage.totalTokens + (response.usageMetadata?.totalTokenCount ?? 0),
        requestCount: usage.requestCount + 1,
      }));
    }

    if (!response.candidates?.length) return [];
    const rawText = response.candidates[0]?.content?.parts?.[0]?.text;
    if (!rawText) return [];

    let parsedData: unknown;
    try {
      parsedData = JSON.parse(rawText.trim());
    } catch {
      return [];
    }

    if (!this.isSuggestionsPayload(parsedData)) return [];
    return this.mapItemsToSuggestions(parsedData.suggestions);
  }

  private isSuggestionsPayload(
    data: unknown
  ): data is { suggestions: unknown[] } {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
    const obj = data as Record<string, unknown>;
    return Array.isArray(obj['suggestions']);
  }

  private handleApiError(error: unknown): Observable<AISuggestion[]> {
    let errorMessage =
      'AI suggestions temporarily unavailable. Please try again.';
    let suggestionId: string = SUGGESTION_IDS.API_ERROR;

    if (
      this.isHttpError(error) &&
      (error.status === 400 || error.status === 401 || error.status === 403)
    ) {
      errorMessage = 'Please check your API key in Settings.';
      suggestionId = SUGGESTION_IDS.INVALID_API_KEY;
      this.aiStatus.set({ kind: 'invalidApiKey', message: errorMessage });
    } else if (this.isHttpError(error) && error.status === 429) {
      errorMessage = 'Too many requests. Please wait a moment.';
      suggestionId = SUGGESTION_IDS.RATE_LIMITED;
      this.aiStatus.set({ kind: 'rateLimited', message: errorMessage });
    } else if (this.isHttpError(error) && error.status === 0) {
      errorMessage = 'Network error. Please check your internet connection.';
      this.aiStatus.set({ kind: 'error', message: errorMessage });
    } else if (this.isTimeoutError(error)) {
      errorMessage = 'Request timed out. Please try again.';
      this.aiStatus.set({ kind: 'error', message: errorMessage });
    } else {
      this.aiStatus.set({ kind: 'error', message: errorMessage });
    }

    return of([{ id: suggestionId, text: errorMessage }]);
  }

  resetTokenUsage() {
    this.tokenUsage.set({
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      requestCount: 0,
    });
  }

  setApiKey(apiKey: string) {
    this.apiKey = apiKey && apiKey.trim() ? apiKey.trim() : this.defaultApiKey;
  }

  private static defaultGenerationConfig() {
    return {
      thinkingConfig: {
        thinkingLevel: 'LOW',
      },
    } as const;
  }

  private mapItemsToSuggestions(items: unknown[]): AISuggestion[] {
    const maxItems = 5;
    const picked = [] as AISuggestion[];

    for (let i = 0; i < items.length && picked.length < maxItems; i++) {
      const item = items[i];
      if (!this.isParsedSuggestion(item)) continue;
      picked.push({
        id: `gemini-${picked.length + 1}`,
        text: item.text,
        originalText:
          typeof item.originalText === 'string' ? item.originalText : undefined,
      });
    }
    return picked;
  }

  private isParsedSuggestion(
    item: unknown
  ): item is { text: string; originalText?: string } {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
    const obj = item as Record<string, unknown>;
    return typeof obj['text'] === 'string';
  }

  private isHttpError(error: unknown): error is HttpErrorResponse {
    return !!error && typeof error === 'object' && 'status' in (error as any);
  }
  private isTimeoutError(error: unknown): boolean {
    return !!error && (error as any).name === 'TimeoutError';
  }
}
