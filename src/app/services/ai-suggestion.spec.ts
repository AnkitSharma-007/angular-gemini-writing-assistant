import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { AISuggestionService } from './ai-suggestion';

describe('AISuggestionService', () => {
  let service: AISuggestionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AISuggestionService,
      ],
    });
    service = TestBed.inject(AISuggestionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
