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
import { SettingsComponent } from '../settings/settings.component';
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

  currentText = signal('');
  isProcessing = signal(false);
  suggestions = signal<AISuggestion[]>([]);
  showSettings = signal(false);

  settings = signal<UserSettings>({
    ...this.settingsService.loadUserSettings(),
  });

  showApiKeyNotice = signal(false);
  apiKeyNoticeMessage = signal('');

  tokenUsage = this.aiSuggestionService.getTokenUsage;

  wordCount = computed(() => {
    const text = this.currentText().trim();
    if (!text) return 0;
    return text.split(/\s+/).filter((word) => word.length > 0).length;
  });

  characterCount = computed(() => this.currentText().length);

  filteredSuggestions = computed(() => this.suggestions().slice(0, 5));

  private debounceHandle: any;
  private lastQuery = '';

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

  private setupSuggestionsEffect() {
    effect((onCleanup) => {
      const text = this.currentText().trim();
      const auto = this.settings().autoSuggestions;

      if (this.debounceHandle) {
        clearTimeout(this.debounceHandle);
        this.debounceHandle = undefined;
      }

      if (!text || !auto) {
        this.suggestions.set([]);
        this.isProcessing.set(false);
        return;
      }

      if (text === this.lastQuery) {
        return;
      }

      this.debounceHandle = setTimeout(() => {
        this.requestSuggestions(text);
      }, 500);

      onCleanup(() => {
        if (this.debounceHandle) {
          clearTimeout(this.debounceHandle);
          this.debounceHandle = undefined;
        }
      });
    });
  }

  private setupAiStatusNoticeEffect() {
    effect(() => {
      const status = this.aiSuggestionService.getAIStatus;
      const s = status();
      if (s.kind === 'invalidApiKey' || s.kind === 'noApiKey') {
        this.apiKeyNoticeMessage.set(
          s.message || 'Your API key seems invalid. Update it in Settings.'
        );
        this.showApiKeyNotice.set(true);
      } else {
        this.showApiKeyNotice.set(false);
        this.apiKeyNoticeMessage.set('');
      }
    });
  }

  private requestSuggestions(text: string): Subscription {
    this.isProcessing.set(true);
    return this.aiSuggestionService
      .getSuggestions(text)
      .pipe(
        catchError(() =>
          of([
            {
              id: SUGGESTION_IDS.API_ERROR,
              text: 'Failed to get suggestions.',
            },
          ])
        ),
        finalize(() => this.isProcessing.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((suggestions) => {
        const filtered = suggestions.filter(
          (s) =>
            s.id !== SUGGESTION_IDS.NO_API_KEY &&
            s.id !== SUGGESTION_IDS.INVALID_API_KEY
        );
        this.suggestions.set(filtered);
        this.lastQuery = text;
      });
  }

  applySuggestion(suggestion: AISuggestion) {
    const currentText = this.currentText();
    let newText = currentText;

    if (suggestion.originalText) {
      newText = currentText.replace(suggestion.originalText, suggestion.text);
    } else {
      newText = suggestion.text;
    }

    this.currentText.set(newText);
    this.dismissSuggestion(suggestion);
  }

  dismissSuggestion(suggestion: AISuggestion) {
    this.suggestions.update((suggestions) =>
      suggestions.filter((s) => s.id !== suggestion.id)
    );
  }

  onSettingsChange(updates: Partial<UserSettings>) {
    this.settings.update((current) => ({ ...current, ...updates }));

    this.settingsService.updateUserSettings(updates);

    if (updates.geminiApiKey !== undefined) {
      this.aiSuggestionService.setApiKey(updates.geminiApiKey || '');
      this.showApiKeyNotice.set(false);
      this.apiKeyNoticeMessage.set('');
    }
  }

  toggleSettings() {
    this.showSettings.set(!this.showSettings());
  }

  closeSettings() {
    this.showSettings.set(false);
  }

  toggleAutoSuggestions() {
    const current = this.settings().autoSuggestions;
    this.onSettingsChange({ autoSuggestions: !current });

    if (!this.settings().autoSuggestions) {
      this.suggestions.set([]);
      this.isProcessing.set(false);
    }
  }

  dismissApiKeyNotice() {
    this.showApiKeyNotice.set(false);
  }
}
