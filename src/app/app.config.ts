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
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient(withInterceptorsFromDi()),
    { provide: MODEL_ID, useValue: 'gemini-2.5-flash' },
    {
      provide: API_BASE,
      useValue: 'https://generativelanguage.googleapis.com/v1beta',
    },
    { provide: TIMEOUT_MS, useValue: 10000 },
    { provide: MAX_OUTPUT_TOKENS, useValue: 5000 },
  ],
};
