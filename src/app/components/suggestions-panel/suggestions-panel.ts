import { Component, input, output } from '@angular/core';
import { AISuggestion } from '../../models/helper';

@Component({
  selector: 'app-suggestions-panel',
  templateUrl: './suggestions-panel.html',
  styleUrl: './suggestions-panel.scss',
})
export class SuggestionsPanelComponent {
  // Inputs
  suggestions = input.required<AISuggestion[]>();

  // Outputs
  applySuggestion = output<AISuggestion>();
  dismissSuggestion = output<AISuggestion>();
}
