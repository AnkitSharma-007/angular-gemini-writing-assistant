import {
  Component,
  signal,
  computed,
  inject,
  effect,
  DestroyRef,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AISuggestionService } from '../../services/ai-suggestion';
import { SettingsService } from '../../services/settings';
import { catchError, of, finalize, Subscription } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AISuggestion, UserSettings } from '../../models/helper';
import { SUGGESTION_IDS } from '../../shared/constants';
import { SettingsComponent } from '../settings/settings';
import { SuggestionsPanelComponent } from '../suggestions-panel/suggestions-panel';

@Component({
  selector: 'app-editor',
  imports: [FormsModule, SettingsComponent, SuggestionsPanelComponent],
  templateUrl: './editor.html',
  styleUrls: ['./editor.scss'],
})
export class EditorComponent {
  private readonly aiSuggestionService = inject(AISuggestionService);
  private readonly settingsService = inject(SettingsService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly DEBOUNCE_TIME_MS = 500 as const;
  private readonly MAX_SUGGESTIONS_DISPLAY = 5 as const;

  readonly currentText = signal<string>('');
  readonly isProcessing = signal<boolean>(false);
  readonly suggestions = signal<AISuggestion[]>([]);
  readonly showSettings = signal<boolean>(false);
  readonly showApiKeyNotice = signal<boolean>(false);
  readonly apiKeyNoticeMessage = signal<string>('');

  readonly settings = signal<UserSettings>({
    ...this.settingsService.loadUserSettings(),
  });

  readonly tokenUsage = this.aiSuggestionService.getTokenUsage;

  readonly wordCount = computed(() => {
    const text = this.currentText().trim();
    if (!text) return 0;
    return text.split(/\s+/).filter((word) => word.length > 0).length;
  });

  readonly characterCount = computed(() => this.currentText().length);

  readonly filteredSuggestions = computed(() =>
    this.suggestions().slice(0, this.MAX_SUGGESTIONS_DISPLAY)
  );

  private debounceHandle: ReturnType<typeof setTimeout> | undefined;
  private lastQuery = '';
  private currentSubscription: Subscription | undefined;

  constructor() {
    this.initializeApiKey();
    this.setupAiStatusNoticeEffect();
    this.setupSuggestionsEffect();
  }

  private initializeApiKey(): void {
    const settings = this.settings();
    if (settings.geminiApiKey) {
      this.aiSuggestionService.setApiKey(settings.geminiApiKey);
    }
  }

  private setupSuggestionsEffect(): void {
    effect((onCleanup) => {
      const text = this.currentText().trim();
      const auto = this.settings().autoSuggestions;

      this.cancelPendingRequests();

      if (!text || !auto) {
        this.resetSuggestions();
        return;
      }

      if (text === this.lastQuery) {
        return;
      }

      this.debounceHandle = setTimeout(() => {
        this.requestSuggestions(text);
      }, this.DEBOUNCE_TIME_MS);

      onCleanup(() => this.cancelPendingRequests());
    });
  }

  private cancelPendingRequests(): void {
    if (this.debounceHandle) {
      clearTimeout(this.debounceHandle);
      this.debounceHandle = undefined;
    }

    if (this.currentSubscription) {
      this.currentSubscription.unsubscribe();
      this.currentSubscription = undefined;
    }
  }

  private resetSuggestions(): void {
    this.suggestions.set([]);
    this.isProcessing.set(false);
  }

  private setupAiStatusNoticeEffect(): void {
    effect(() => {
      const status = this.aiSuggestionService.getAIStatus();
      if (status.kind === 'invalidApiKey' || status.kind === 'noApiKey') {
        this.apiKeyNoticeMessage.set(
          status.message || 'Your API key seems invalid. Update it in Settings.'
        );
        this.showApiKeyNotice.set(true);
      } else {
        this.showApiKeyNotice.set(false);
        this.apiKeyNoticeMessage.set('');
      }
    });
  }

  private requestSuggestions(text: string): void {
    this.isProcessing.set(true);
    this.currentSubscription = this.aiSuggestionService
      .getSuggestions(text)
      .pipe(
        catchError((error) => {
          console.error('Failed to fetch suggestions:', error);
          return of([
            {
              id: SUGGESTION_IDS.API_ERROR,
              text: 'Failed to get suggestions.',
            },
          ]);
        }),
        finalize(() => this.isProcessing.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((suggestions) => {
        this.processSuggestions(suggestions, text);
      });
  }

  private processSuggestions(suggestions: AISuggestion[], query: string): void {
    const filteredSuggestions = this.filterSystemSuggestions(suggestions);
    this.suggestions.set(filteredSuggestions);
    this.lastQuery = query;
  }

  private filterSystemSuggestions(suggestions: AISuggestion[]): AISuggestion[] {
    return suggestions.filter(
      (suggestion) =>
        suggestion.id !== SUGGESTION_IDS.NO_API_KEY &&
        suggestion.id !== SUGGESTION_IDS.INVALID_API_KEY
    );
  }

  applySuggestion(suggestion: AISuggestion): void {
    const newText = suggestion.originalText
      ? this.currentText().replace(suggestion.originalText, suggestion.text)
      : suggestion.text;

    this.currentText.set(newText);
    this.dismissSuggestion(suggestion);
  }

  dismissSuggestion(suggestion: AISuggestion): void {
    this.suggestions.update((suggestions) =>
      suggestions.filter((s) => s.id !== suggestion.id)
    );
  }

  onSettingsChange(updates: Partial<UserSettings>): void {
    this.settings.update((current) => ({ ...current, ...updates }));
    this.settingsService.updateUserSettings(updates);

    if (updates.geminiApiKey !== undefined) {
      this.updateApiKey(updates.geminiApiKey);
    }
  }

  private updateApiKey(apiKey: string): void {
    this.aiSuggestionService.setApiKey(apiKey);
    this.showApiKeyNotice.set(false);
    this.apiKeyNoticeMessage.set('');
  }

  toggleSettings(): void {
    this.showSettings.update((current) => !current);
  }

  closeSettings(): void {
    this.showSettings.set(false);
  }

  toggleAutoSuggestions(): void {
    const isEnabled = this.settings().autoSuggestions;
    this.onSettingsChange({ autoSuggestions: !isEnabled });

    if (!this.settings().autoSuggestions) {
      this.resetSuggestions();
    }
  }

  dismissApiKeyNotice(): void {
    this.showApiKeyNotice.set(false);
  }
}
