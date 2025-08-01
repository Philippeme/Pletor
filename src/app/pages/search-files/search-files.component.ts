import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { ApplicationService } from '../../services/application.service';
import { Application, ApplicationTimeline, TimelineStatus } from '../../models/application.model';

@Component({
  selector: 'app-search-files',
  templateUrl: './search-files.component.html',
  styleUrls: ['./search-files.component.scss']
})
export class SearchFilesComponent implements OnInit {
  searchForm: FormGroup;
  isLoading = false;
  searchResult: Application | null = null;
  filteredTimeline: ApplicationTimeline[] = [];
  errorMessage = '';
  hasSearched = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private applicationService: ApplicationService,
    private translate: TranslateService
  ) {
    this.searchForm = this.fb.group({
      trackingNumber: ['', [Validators.required, Validators.pattern(/^MKG[0-9A-Z]{12}$/)]]
    });
  }

  ngOnInit(): void {
    // Check for tracking number in query params
    this.route.queryParams.subscribe(params => {
      if (params['trackingNumber']) {
        this.searchForm.patchValue({
          trackingNumber: params['trackingNumber']
        });
        this.onSearch();
      }
    });
  }

  onSearch(): void {
    if (this.searchForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      this.searchResult = null;
      this.filteredTimeline = [];
      this.hasSearched = true;

      const trackingNumber = this.searchForm.get('trackingNumber')?.value;

      this.applicationService.searchApplicationByTrackingNumber(trackingNumber).subscribe({
        next: (application) => {
          this.isLoading = false;
          if (application) {
            this.searchResult = application;
            this.filteredTimeline = this.getFilteredTimeline(application);
          } else {
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

  /**
   * NEW: Navigate to the appropriate application component to continue the process
   */
  continueApplication(): void {
    if (!this.searchResult) return;

    const serviceId = this.searchResult.serviceId;
    const applicationId = this.searchResult.id;

    let route: string;
    switch (serviceId) {
      case 1: // Passport Application
        route = '/passport-application';
        break;
      case 2: // Birth Certificate
        route = '/birth-certificate';
        break;
      default:
        console.warn('Unknown service ID:', serviceId);
        return;
    }

    // Navigate to the application with the application ID as query parameter
    this.router.navigate([route], {
      queryParams: { applicationId: applicationId }
    });
  }

  /**
   * NEW: Check if the application can be continued (not completed)
   */
  canContinueApplication(): boolean {
    if (!this.searchResult) return false;
    
    const completedStatuses = ['completed', 'delivered', 'collected'];
    return !completedStatuses.includes(this.searchResult.status.toLowerCase());
  }


  /**
   * Get step progress text with translation
   */
  getStepProgressText(): string {
    const currentStepInfo = this.getCurrentStepInfo();
    if (!currentStepInfo) return '';
    
    const stepLabel = this.translate.instant('search_files.application_header.step_label');
    const ofLabel = this.translate.instant('search_files.application_header.of_label');
    
    return `${stepLabel} ${currentStepInfo.stepNumber} ${ofLabel} ${currentStepInfo.totalSteps}`;
  }

  /**
   * Get progress showing text with translation
   */
  getProgressShowingText(): string {
    if (!this.searchResult || !this.filteredTimeline.length) return '';
    
    const showingLabel = this.translate.instant('search_files.application_header.progress_showing_label');
    const ofLabel = this.translate.instant('search_files.application_header.progress_of_label');
    const stepsLabel = this.translate.instant('search_files.application_header.progress_steps_label');
    
    const shown = this.filteredTimeline.length;
    const total = this.getTotalStepsForService(this.searchResult.serviceId);
    
    return `${showingLabel} ${shown} ${ofLabel} ${total} ${stepsLabel}`;
  }

  /**
   * Get complete step text with translation
   */
  getCompleteStepText(): string {
    const currentStepInfo = this.getCurrentStepInfo();
    if (!currentStepInfo) return '';
    
    const completePrefix = this.translate.instant('search_files.timeline.complete_step_prefix');
    
    return `${completePrefix} ${currentStepInfo.stepName}`;
  }

  /**
   * Get completion progress text with translation
   */
  getCompletionProgressText(): string {
    const progressPrefix = this.translate.instant('search_files.timeline.completion_progress_prefix');
    const progressSuffix = this.translate.instant('search_files.timeline.completion_progress_suffix');
    
    return `${this.getProgressPercentage()}${progressSuffix} ${progressPrefix}`;
  }

  /**
   * NEW: Get the continue button text with separated translations
   */
  getContinueButtonTextTranslated(): string {
    if (!this.searchResult) {
      return this.translate.instant('search_files.actions.continue_application');
    }

    const serviceName = this.getServiceNameTranslated(this.searchResult.serviceId);
    const currentStepInfo = this.getCurrentStepInfo();
    
    if (currentStepInfo) {
      const continuePrefix = this.translate.instant('search_files.actions.continue_service_prefix');
      const stepLabel = this.translate.instant('search_files.actions.continue_service_step');
      
      return `${continuePrefix} ${serviceName} ${stepLabel} ${currentStepInfo.stepNumber}`;
    }
    
    const continuePrefix = this.translate.instant('search_files.actions.continue_service_prefix');
    return `${continuePrefix} ${serviceName}`;
  }

  /**
   * NEW: Get service name with translation
   */
  getServiceNameTranslated(serviceId: number): string {
    switch (serviceId) {
      case 1: 
        return this.translate.instant('search_files.services.passport');
      case 4: 
        return this.translate.instant('search_files.services.birth_certificate');
      default: 
        return this.translate.instant('search_files.actions.continue_application');
    }
  }

    /**
     * NEW: Get the continue button text based on application type and status
     */
    getContinueButtonText(): string {
      if (!this.searchResult) return 'Continue Application';

      const serviceName = this.getServiceName(this.searchResult.serviceId);
      const currentStepInfo = this.getCurrentStepInfo();
      
      if (currentStepInfo) {
        return `Continue ${serviceName} - Step ${currentStepInfo.stepNumber}`;
      }
      
      return `Continue ${serviceName}`;
    }

  /**
   * NEW: Get service name based on service ID
   */
  getServiceName(serviceId: number): string {
    switch (serviceId) {
      case 1: return 'Passport Application';
      case 4: return 'Birth Certificate';
      default: return 'Application';
    }
  }

  /**
   * NEW: Get the continue button icon based on application type
   */
  getContinueButtonIcon(): string {
    if (!this.searchResult) return 'fas fa-arrow-right';

    switch (this.searchResult.serviceId) {
      case 1: return 'fas fa-passport';
      case 2: return 'fas fa-certificate';
      default: return 'fas fa-arrow-right';
    }
  }

  /**
   * Filters timeline to show only relevant steps based on current progress
   * Shows only steps up to current active step + completed steps
   */
  private getFilteredTimeline(application: Application): ApplicationTimeline[] {
    if (!application.timeline || application.timeline.length === 0) {
      return [];
    }

    const timeline = [...application.timeline];
    
    // Find the current active step (first non-completed step)
    let currentActiveIndex = timeline.findIndex(step => !step.isCompleted);
    
    // If all steps are completed, show all steps
    if (currentActiveIndex === -1) {
      return timeline;
    }

    // For passport applications (6 steps)
    if (application.serviceId === 1) {
      return this.getPassportFilteredSteps(timeline, currentActiveIndex);
    }
    
    // For birth certificate (3 steps)
    if (application.serviceId === 4) {
      return this.getBirthCertificateFilteredSteps(timeline, currentActiveIndex);
    }

    // Default: show up to current active step + 1
    return timeline.slice(0, currentActiveIndex + 1);
  }

  private getPassportFilteredSteps(timeline: ApplicationTimeline[], activeIndex: number): ApplicationTimeline[] {
    // Passport has 6 specific steps - show based on actual progress
    const maxVisibleIndex = Math.min(activeIndex + 1, timeline.length);
    
    // For passport, we want to show progressive disclosure:
    // Step 1: Show only step 1
    // Step 2: Show steps 1-2
    // Step 3: Show steps 1-3
    // etc.
    
    return timeline.slice(0, maxVisibleIndex);
  }

  private getBirthCertificateFilteredSteps(timeline: ApplicationTimeline[], activeIndex: number): ApplicationTimeline[] {
    // Birth certificate has 3 steps - show based on actual progress
    const maxVisibleIndex = Math.min(activeIndex + 1, timeline.length);
    
    return timeline.slice(0, maxVisibleIndex);
  }

  /**
   * Gets the current step information for display
   */
  getCurrentStepInfo(): { stepNumber: number; totalSteps: number; stepName: string } | null {
    if (!this.searchResult || !this.filteredTimeline.length) {
      return null;
    }

    const activeStep = this.filteredTimeline.find(step => 
      step.status === TimelineStatus.IN_PROGRESS || 
      (!step.isCompleted && step.status === TimelineStatus.PENDING)
    );

    if (activeStep) {
      const stepIndex = this.filteredTimeline.indexOf(activeStep);
      return {
        stepNumber: stepIndex + 1,
        totalSteps: this.getTotalStepsForService(this.searchResult.serviceId),
        stepName: activeStep.step
      };
    }

    // All visible steps completed
    const completedSteps = this.filteredTimeline.filter(step => step.isCompleted).length;
    return {
      stepNumber: completedSteps,
      totalSteps: this.getTotalStepsForService(this.searchResult.serviceId),
      stepName: 'Processing'
    };
  }

  getTotalStepsForService(serviceId: number): number {
    switch (serviceId) {
      case 1: return 6; // Passport
      case 2: return 3; // Birth Certificate
      default: return 4; // Default
    }
  }

  /**
   * Gets progress percentage based on visible timeline
   */
  getProgressPercentage(): number {
    if (!this.filteredTimeline.length) return 0;

    const completedSteps = this.filteredTimeline.filter(step => step.isCompleted).length;
    const totalVisibleSteps = this.filteredTimeline.length;
    
    return Math.round((completedSteps / totalVisibleSteps) * 100);
  }

  /**
   * Determines if the next step preview should be shown
   */
  shouldShowNextStepPreview(): boolean {
    if (!this.searchResult || !this.filteredTimeline.length) return false;

    const totalSteps = this.getTotalStepsForService(this.searchResult.serviceId);
    const visibleSteps = this.filteredTimeline.length;
    
    // Show preview if there are more steps and current visible steps are progressing
    return visibleSteps < totalSteps && this.getProgressPercentage() > 0;
  }

  /**
   * Gets the next step name for preview
   */
  getNextStepPreview(): string {
    if (!this.searchResult || !this.shouldShowNextStepPreview()) return '';

    const allSteps = this.searchResult.timeline;
    const nextStepIndex = this.filteredTimeline.length;
    
    if (nextStepIndex < allSteps.length) {
      return allSteps[nextStepIndex].step;
    }
    
    return '';
  }

  clearSearch(): void {
    this.searchForm.reset();
    this.searchResult = null;
    this.filteredTimeline = [];
    this.errorMessage = '';
    this.hasSearched = false;
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'completed': return 'success';
      case 'processing': return 'primary';
      case 'payment_pending': return 'warning';
      case 'rejected': return 'danger';
      case 'under_review': return 'info';
      default: return 'secondary';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'completed': return 'fas fa-check-circle';
      case 'processing': return 'fas fa-cog fa-spin';
      case 'payment_pending': return 'fas fa-credit-card';
      case 'rejected': return 'fas fa-times-circle';
      case 'under_review': return 'fas fa-search';
      default: return 'fas fa-clock';
    }
  }

  getTimelineStepIcon(step: ApplicationTimeline): string {
    if (step.isCompleted) {
      return 'fas fa-check-circle text-success';
    } else if (step.status === TimelineStatus.IN_PROGRESS) {
      return 'fas fa-cog fa-spin text-primary';
    } else {
      return 'fas fa-clock text-muted';
    }
  }

  formatDate(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatSimpleDate(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  /**
   * NEW: Copy tracking number to clipboard (for sharing functionality)
   */
  copyTrackingNumber(): void {
    if (this.searchResult?.trackingNumber) {
      navigator.clipboard.writeText(this.searchResult.trackingNumber).then(() => {
        // Success feedback could be added here
      }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = this.searchResult!.trackingNumber;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      });
    }
  }
}