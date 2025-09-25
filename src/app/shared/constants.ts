export const SUGGESTION_IDS = {
  NO_API_KEY: 'no-api-key',
  INVALID_API_KEY: 'invalid-api-key',
  API_ERROR: 'api-error',
  RATE_LIMITED: 'rate-limited',
} as const;

export type SuggestionId = (typeof SUGGESTION_IDS)[keyof typeof SUGGESTION_IDS];
