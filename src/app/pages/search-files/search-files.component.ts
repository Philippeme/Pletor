import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { ApplicationService } from '../../services/application.service';
import { Application } from '../../models/application.model';

@Component({
  selector: 'app-search-files',
  templateUrl: './search-files.component.html',
  styleUrls: ['./search-files.component.scss']
})
export class SearchFilesComponent implements OnInit {
  searchForm: FormGroup;
  isLoading = false;
  searchResult: Application | null = null;
  errorMessage = '';
  hasSearched = false;

  constructor(
    private fb: FormBuilder,
    private applicationService: ApplicationService,
    private translate: TranslateService
  ) {
    this.searchForm = this.fb.group({
      trackingNumber: ['', [Validators.required, Validators.pattern(/^MKG[0-9A-Z]{12}$/)]]
    });
  }

  ngOnInit(): void { }

  onSearch(): void {
    if (this.searchForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      this.searchResult = null;
      this.hasSearched = true;

      const trackingNumber = this.searchForm.get('trackingNumber')?.value;

      this.applicationService.searchApplicationByTrackingNumber(trackingNumber).subscribe({
        next: (application) => {
          this.isLoading = false;
          this.searchResult = application || null;
          if (!application) {
            this.errorMessage = 'No application found with this tracking number.';
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = 'Search failed. Please try again.';
          console.error('Search error:', error);
        }
      });
    } else {
      this.searchForm.get('trackingNumber')?.markAsTouched();
    }
  }

  clearSearch(): void {
    this.searchForm.reset();
    this.searchResult = null;
    this.errorMessage = '';
    this.hasSearched = false;
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'completed': return 'success';
      case 'processing': return 'primary';
      case 'payment_pending': return 'warning';
      case 'rejected': return 'danger';
      default: return 'secondary';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'completed': return 'fas fa-check-circle';
      case 'processing': return 'fas fa-spinner fa-spin';
      case 'payment_pending': return 'fas fa-credit-card';
      case 'rejected': return 'fas fa-times-circle';
      default: return 'fas fa-clock';
    }
  }

  formatDate(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}