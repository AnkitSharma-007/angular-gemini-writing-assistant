import { Injectable } from '@angular/core';
import { UserSettings } from '../models/helper';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly prefix = 'aiWriter_';

  get<T>(key: string, defaultValue: T): T {
    try {
      const stored = localStorage.getItem(this.key(key));
      return stored ? (JSON.parse(stored) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(this.key(key), JSON.stringify(value));
    } catch {
      // Ignore localStorage errors (e.g., quota, privacy mode)
    }
  }

  loadUserSettings(): UserSettings {
    return {
      autoSuggestions: this.get<boolean>('autoSuggestions', true),
      geminiApiKey: this.get<string>('geminiApiKey', ''),
    };
  }

  updateUserSettings(updates: Partial<UserSettings>): void {
    Object.entries(updates).forEach(([key, value]) => {
      this.set(key, value as any);
    });
  }

  private key(k: string): string {
    return `${this.prefix}${k}`;
  }
}
