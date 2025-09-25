import { Component, inject, input, OnInit, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UserSettings, TokenUsage } from '../../models/helper';
import { AISuggestionService } from '../../services/ai-suggestion';

@Component({
  selector: 'app-settings',
  imports: [FormsModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent implements OnInit {
  private readonly aiSuggestionService = inject(AISuggestionService);

  readonly settings = input.required<UserSettings>();
  readonly tokenUsage = input.required<TokenUsage>();

  readonly settingsChange = output<Partial<UserSettings>>();
  readonly close = output<void>();

  protected apiKeyValue = '';

  ngOnInit() {
    this.apiKeyValue = this.settings().geminiApiKey || '';
  }

  closeModal() {
    this.close.emit();
  }

  saveApiKey(apiKey: string) {
    const trimmedKey = apiKey.trim();

    if (!this.isValidApiKey(trimmedKey)) {
      return;
    }

    this.updateApiKey(trimmedKey);
    this.closeModal();
  }

  clearApiKey() {
    this.apiKeyValue = '';
    this.updateApiKey(undefined);
  }

  resetUsageStats() {
    this.aiSuggestionService.resetTokenUsage();
  }

  private isValidApiKey(apiKey: string | undefined): apiKey is string {
    return !!apiKey && apiKey.length > 0;
  }

  private updateApiKey(apiKey: string | undefined): void {
    this.settingsChange.emit({ geminiApiKey: apiKey });
    this.aiSuggestionService.setApiKey(apiKey || '');
  }
}
