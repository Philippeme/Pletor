import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { ApplicationService } from '../../services/application.service';
import { AuthService } from '../../services/auth.service';
import { Application, ApplicationStatus, PaymentMethod, PaymentStatus } from '../../models/application.model';
import { ApplicantType } from '../../models/service.model';

@Component({
  selector: 'app-birth-certificate',
  templateUrl: './birth-certificate.component.html',
  styleUrls: ['./birth-certificate.component.scss']
})
export class BirthCertificateComponent implements OnInit {
  application: Application | null = null;
  certificateForm: FormGroup;
  currentStep = 1;
  totalSteps = 4;
  isLoading = false;
  isSubmitting = false;
  errorMessage = '';
  successMessage = '';

  // Payment properties
  selectedPaymentMethod: PaymentMethod = PaymentMethod.MTN_MONEY;
  paymentMethods = [
    { value: PaymentMethod.MTN_MONEY, label: 'MTN Mobile Money', icon: 'fas fa-mobile-alt' },
    { value: PaymentMethod.ORANGE_MONEY, label: 'Orange Money', icon: 'fas fa-mobile-alt' },
    { value: PaymentMethod.CASH, label: 'Pay at Registry', icon: 'fas fa-money-bill-wave' }
  ];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private applicationService: ApplicationService,
    private authService: AuthService,
    private translate: TranslateService
  ) {
    this.certificateForm = this.fb.group({
      // Request Information
      requestType: ['self', Validators.required],
      requestFor: ['', Validators.required],

      // Person's Information (whose certificate is being requested)
      personFirstName: ['', Validators.required],
      personLastName: ['', Validators.required],
      personMiddleName: [''],
      personDateOfBirth: ['', Validators.required],
      personPlaceOfBirth: ['', Validators.required],
      personGender: ['', Validators.required],

      // Parents Information
      fatherFirstName: ['', Validators.required],
      fatherLastName: ['', Validators.required],
      motherFirstName: ['', Validators.required],
      motherLastName: ['', Validators.required],
      motherMaidenName: [''],

      // Requester Information (if different from person)
      requesterFirstName: [''],
      requesterLastName: [''],
      requesterPhoneNumber: [''],
      requesterEmail: [''],
      requesterAddress: [''],
      requesterIdNumber: [''],
      relationshipToPerson: [''],
      reasonForRequest: [''],

      // Collection Information
      collectionMethod: ['pickup', Validators.required],
      collectionLocation: ['', Validators.required],
      urgentRequest: [false]
    });
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['applicationId']) {
        this.loadApplication(params['applicationId']);
      } else {
        this.createNewApplication();
      }
    });

    this.prefillUserData();
    this.onRequestTypeChange();
  }

  private loadApplication(applicationId: string): void {
    this.applicationService.getApplicationById(applicationId).subscribe({
      next: (application) => {
        if (application) {
          this.application = application;
          this.determineCurrentStep();
        }
      },
      error: (error) => {
        console.error('Error loading application:', error);
        this.errorMessage = 'Failed to load application details.';
      }
    });
  }

  private createNewApplication(): void {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.applicationService.createApplication(
        4, // birth-certificate-copy service ID (numeric)
        'Birth Certificate Copy',
        ApplicantType.SELF,
        currentUser.id!
      ).subscribe({
        next: (application) => {
          this.application = application;
        },
        error: (error) => {
          console.error('Error creating application:', error);
          this.errorMessage = 'Failed to create application.';
        }
      });
    }
  }

  private prefillUserData(): void {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.certificateForm.patchValue({
        requesterPhoneNumber: currentUser.phoneNumber,
        requesterEmail: currentUser.email,
        requesterFirstName: currentUser.firstName || '',
        requesterLastName: currentUser.lastName || ''
      });
    }
  }

  private determineCurrentStep(): void {
    if (!this.application) return;

    switch (this.application.status) {
      case ApplicationStatus.DRAFT:
        this.currentStep = 1;
        break;
      case ApplicationStatus.SUBMITTED:
        this.currentStep = 2;
        break;
      case ApplicationStatus.PAYMENT_PENDING:
        this.currentStep = 3;
        break;
      case ApplicationStatus.PROCESSING:
        this.currentStep = 4;
        break;
      default:
        this.currentStep = 1;
    }
  }

  onRequestTypeChange(): void {
    const requestType = this.certificateForm.get('requestType')?.value;
    const currentUser = this.authService.getCurrentUser();

    if (requestType === 'self' && currentUser) {
      // Pre-fill person's information with user's data
      this.certificateForm.patchValue({
        personFirstName: currentUser.firstName || '',
        personLastName: currentUser.lastName || '',
        requesterFirstName: currentUser.firstName || '',
        requesterLastName: currentUser.lastName || '',
        requesterPhoneNumber: currentUser.phoneNumber,
        requesterEmail: currentUser.email,
        relationshipToPerson: 'Self',
        reasonForRequest: 'Personal use'
      });

      // Clear validators for requester info when requesting for self
      this.clearRequesterValidators();
    } else {
      // Set validators for requester info when requesting for someone else
      this.setRequesterValidators();
    }
  }

  private clearRequesterValidators(): void {
    const requesterFields = ['requesterFirstName', 'requesterLastName', 'requesterPhoneNumber',
      'requesterEmail', 'requesterAddress', 'requesterIdNumber',
      'relationshipToPerson', 'reasonForRequest'];

    requesterFields.forEach(field => {
      this.certificateForm.get(field)?.clearValidators();
      this.certificateForm.get(field)?.updateValueAndValidity();
    });
  }

  private setRequesterValidators(): void {
    const requesterFields = ['requesterFirstName', 'requesterLastName', 'requesterPhoneNumber',
      'requesterEmail', 'requesterAddress', 'requesterIdNumber',
      'relationshipToPerson', 'reasonForRequest'];

    requesterFields.forEach(field => {
      this.certificateForm.get(field)?.setValidators([Validators.required]);
      this.certificateForm.get(field)?.updateValueAndValidity();
    });
  }

  nextStep(): void {
    if (this.currentStep < this.totalSteps) {
      if (this.validateCurrentStep()) {
        this.currentStep++;
      }
    }
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  private validateCurrentStep(): boolean {
    switch (this.currentStep) {
      case 1: // Person Information
        const personFields = ['personFirstName', 'personLastName', 'personDateOfBirth',
          'personPlaceOfBirth', 'personGender', 'fatherFirstName',
          'fatherLastName', 'motherFirstName', 'motherLastName'];
        return this.validateFields(personFields);
      case 2: // Requester Information
        if (this.certificateForm.get('requestType')?.value === 'other') {
          const requesterFields = ['requesterFirstName', 'requesterLastName', 'requesterPhoneNumber',
            'requesterEmail', 'requesterAddress', 'requesterIdNumber',
            'relationshipToPerson', 'reasonForRequest'];
          return this.validateFields(requesterFields);
        }
        return true;
      default:
        return true;
    }
  }

  private validateFields(fieldNames: string[]): boolean {
    let isValid = true;
    fieldNames.forEach(fieldName => {
      const control = this.certificateForm.get(fieldName);
      if (control && control.invalid) {
        control.markAsTouched();
        isValid = false;
      }
    });
    return isValid;
  }

  onSubmitApplication(): void {
    if (this.certificateForm.valid && this.application) {
      this.isSubmitting = true;
      this.errorMessage = '';

      // Simulate form submission
      setTimeout(() => {
        this.application!.status = ApplicationStatus.PAYMENT_PENDING;
        this.isSubmitting = false;
        this.successMessage = 'Application submitted successfully!';
        this.currentStep = 3; // Move to payment step
      }, 1500);
    } else {
      this.markFormGroupTouched();
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.certificateForm.controls).forEach(key => {
      const control = this.certificateForm.get(key);
      if (control) {
        control.markAsTouched();
      }
    });
  }

  onPayment(): void {
    if (this.application) {
      this.isLoading = true;
      this.errorMessage = '';

      const baseAmount = 200; // Base fee
      const urgentFee = this.certificateForm.get('urgentRequest')?.value ? 500 : 0;
      const totalAmount = baseAmount + urgentFee;

      this.applicationService.simulatePayment(
        this.application.id,
        totalAmount,
        this.selectedPaymentMethod
      ).subscribe({
        next: (payment) => {
          this.isLoading = false;
          if (payment.status === PaymentStatus.COMPLETED) {
            this.successMessage = 'Payment completed successfully!';
            this.currentStep = 4; // Move to confirmation step
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = 'Payment failed. Please try again.';
        }
      });
    }
  }

  goToTracking(): void {
    if (this.application) {
      this.router.navigate(['/search-files'], {
        queryParams: { trackingNumber: this.application.trackingNumber }
      });
    }
  }

  calculateTotalAmount(): number {
    const baseAmount = 200;
    const urgentFee = this.certificateForm.get('urgentRequest')?.value ? 500 : 0;
    return baseAmount + urgentFee;
  }

  getExpectedDeliveryTime(): string {
    const isUrgent = this.certificateForm.get('urgentRequest')?.value;
    return isUrgent ? 'Same day (within 4 hours)' : '1-2 business days';
  }
}