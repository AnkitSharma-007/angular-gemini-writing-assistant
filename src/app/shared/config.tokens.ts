import { InjectionToken } from '@angular/core';

export const MODEL_ID = new InjectionToken<string>('MODEL_ID');
export const API_BASE = new InjectionToken<string>('API_BASE');
export const TIMEOUT_MS = new InjectionToken<number>('TIMEOUT_MS');
export const MAX_OUTPUT_TOKENS = new InjectionToken<number>(
  'MAX_OUTPUT_TOKENS'
);
