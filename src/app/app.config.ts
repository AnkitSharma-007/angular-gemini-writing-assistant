import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import {
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import {
  API_BASE,
  MAX_OUTPUT_TOKENS,
  MODEL_ID,
  TIMEOUT_MS,
} from './shared/config.tokens';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient(withInterceptorsFromDi()),
    { provide: MODEL_ID, useValue: 'gemini-3-flash-preview' },
    // { provide: MODEL_ID, useValue: 'gemini-3-pro-preview' },
    {
      provide: API_BASE,
      useValue: 'https://generativelanguage.googleapis.com/v1beta',
    },
    { provide: TIMEOUT_MS, useValue: 50000 },
    { provide: MAX_OUTPUT_TOKENS, useValue: 5000 },
  ],
};
