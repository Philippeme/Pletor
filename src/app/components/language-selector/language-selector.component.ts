import { Component, OnInit } from '@angular/core';
import { TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-language-selector',
  templateUrl: './language-selector.component.html',
  styleUrls: ['./language-selector.component.scss']
})
export class LanguageSelectorComponent implements OnInit {
  availableLanguages = this.translationService.getAvailableLanguages();
  currentLanguage = 'en';

  constructor(private translationService: TranslationService) { }

  ngOnInit(): void {
    this.translationService.currentLanguage$.subscribe(language => {
      this.currentLanguage = language;
    });
  }

  changeLanguage(languageCode: string): void {
    this.translationService.setLanguage(languageCode);
  }

  getCurrentLanguage() {
    return this.availableLanguages.find(lang => lang.code === this.currentLanguage);
  }

  // S'assurer que le flag de la Guinée-Bissau est correct :
getAvailableLanguages(): { code: string; name: string; flag: string }[] {
  return [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'pt', name: 'Português', flag: '🇬🇼' } // Flag de la Guiné-Bissau
  ];
}
}
