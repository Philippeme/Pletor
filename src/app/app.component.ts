import { Component, OnInit } from '@angular/core';
import { TranslationService } from './services/translation.service';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'MK Gov';

  constructor(
    private translationService: TranslationService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Initialize services
    this.translationService.setLanguage('en');
  }
}