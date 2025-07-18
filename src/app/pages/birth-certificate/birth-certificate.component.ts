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
  totalSteps = 3;
  isLoading = false;
  isSubmitting = false;
  errorMessage = '';
  successMessage = '';
  
  // Payment processing states
  isProcessingPayment = false;
  paymentVerificationComplete = false;
  paymentStatusPending = false;
  showPaymentSteps = false;
  currentPaymentStep = 1;
  
  // Accordion states
  activePaymentMethod = '';
  showMtnAccordion = false;
  showOrangeAccordion = false;

  // Payment properties
  selectedPaymentMethod: PaymentMethod = PaymentMethod.MTN_MONEY;
  paymentMethods = [
    { value: PaymentMethod.MTN_MONEY, label: 'MTN Mobile Money', icon: 'fas fa-mobile-alt' },
    { value: PaymentMethod.ORANGE_MONEY, label: 'Orange Money', icon: 'fas fa-mobile-alt' },
    { value: PaymentMethod.CASH, label: 'Pay at Registry', icon: 'fas fa-money-bill-wave' }
  ];

  // MTN Mobile Money form
  mtnForm: FormGroup;
  // Orange Money form
  orangeForm: FormGroup;
  
  // Payment step tracking
  mtnPaymentSteps = [
    { step: 1, title: 'Dial USSD Code', description: 'Dial *126# on your MTN line', status: 'pending' },
    { step: 2, title: 'Select Bill Payment', description: 'Choose option 2 "Bill Payment"', status: 'pending' },
    { step: 3, title: 'Enter Merchant Code', description: 'Enter the 6-digit merchant code', status: 'pending' },
    { step: 4, title: 'Enter Amount', description: 'Enter the payment amount', status: 'pending' },
    { step: 5, title: 'Confirm Payment', description: 'Confirm with your 5-digit PIN', status: 'pending' }
  ];
  
  orangePaymentSteps = [
    { step: 1, title: 'Dial USSD Code', description: 'Dial #150*47# on your Orange line', status: 'pending' },
    { step: 2, title: 'Enter Merchant Code', description: 'Enter the merchant code when prompted', status: 'pending' },
    { step: 3, title: 'Enter Amount', description: 'Enter the payment amount', status: 'pending' },
    { step: 4, title: 'Confirm Payment', description: 'Confirm with your 4-digit secret code', status: 'pending' }
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

      // Person's Information (whose certificate is being requested)
      personFirstName: ['', Validators.required],
      personLastName: ['', Validators.required],
      personMiddleName: [''],
      personDateOfBirth: ['', Validators.required],
      personPlaceOfBirth: ['', Validators.required],
      personGender: ['', Validators.required],

      // Request Inputs (new section)
      userIdentificationNumber: ['', [Validators.required, Validators.pattern(/^[0-9]{8,12}$/)]],
      emailAddress: ['', [Validators.required, Validators.email]],
      requestReason: ['', Validators.required]
    });

    // MTN Mobile Money form - based on real MTN process
    this.mtnForm = this.fb.group({
      phoneNumber: ['', [Validators.required, Validators.pattern(/^(237)?6[0-9]{8}$/)]],
      merchantCode: [{ value: '634826', disabled: true }], // Static merchant code
      transactionId: ['', [Validators.required, Validators.pattern(/^[A-Z0-9]{8,12}$/)]],
      amount: [{ value: '', disabled: true }, Validators.required]
    });

    // Orange Money form - based on real Orange process
    this.orangeForm = this.fb.group({
      phoneNumber: ['', [Validators.required, Validators.pattern(/^(237)?6[0-9]{8}$/)]],
      merchantCode: [{ value: '78945', disabled: true }], // Static merchant code
      transactionId: ['', [Validators.required, Validators.pattern(/^[A-Z0-9]{6,10}$/)]],
      amount: [{ value: '', disabled: true }, Validators.required]
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
    this.updatePaymentAmounts();
  }

  private updatePaymentAmounts(): void {
    const amount = this.calculateTotalAmount();
    this.mtnForm.patchValue({ amount: amount });
    this.orangeForm.patchValue({ amount: amount });
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
        4,
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
        emailAddress: currentUser.email,
        personFirstName: currentUser.firstName || '',
        personLastName: currentUser.lastName || ''
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
        this.currentStep = 2;
        break;
      case ApplicationStatus.PROCESSING:
        this.currentStep = 3;
        break;
      default:
        this.currentStep = 1;
    }
  }

  onRequestTypeChange(): void {
    const requestType = this.certificateForm.get('requestType')?.value;
    const currentUser = this.authService.getCurrentUser();

    if (requestType === 'self' && currentUser) {
      this.certificateForm.patchValue({
        personFirstName: currentUser.firstName || '',
        personLastName: currentUser.lastName || '',
        emailAddress: currentUser.email,
        requestReason: 'Personal use'
      });
    }
  }

  nextStep(): void {
    if (this.currentStep < this.totalSteps) {
      if (this.validateCurrentStep()) {
        this.currentStep++;
        this.errorMessage = '';
      }
    }
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.errorMessage = '';
    }
  }

  private validateCurrentStep(): boolean {
    this.errorMessage = '';
    
    switch (this.currentStep) {
      case 1:
        const allFields = [
          'personFirstName', 'personLastName', 'personDateOfBirth',
          'personPlaceOfBirth', 'personGender', 'userIdentificationNumber',
          'emailAddress', 'requestReason'
        ];
        return this.validateFields(allFields);
      
      default:
        return true;
    }
  }

  private validateFields(fieldNames: string[]): boolean {
    let isValid = true;
    const invalidFields: string[] = [];
    
    fieldNames.forEach(fieldName => {
      const control = this.certificateForm.get(fieldName);
      if (control && control.invalid) {
        control.markAsTouched();
        invalidFields.push(fieldName);
        isValid = false;
      }
    });

    if (!isValid) {
      this.errorMessage = `Please complete all required fields: ${invalidFields.join(', ')}`;
    }

    return isValid;
  }

  onSubmitApplication(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.validateCurrentStep()) {
      return;
    }

    if (!this.application) {
      this.errorMessage = 'Application not found. Please try again.';
      return;
    }

    this.isSubmitting = true;
    
    setTimeout(() => {
      try {
        this.application!.status = ApplicationStatus.PAYMENT_PENDING;
        this.isSubmitting = false;
        this.successMessage = 'Application submitted successfully!';
        this.currentStep = 2;
        this.updatePaymentAmounts();
        
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
        
      } catch (error) {
        this.isSubmitting = false;
        this.errorMessage = 'Failed to submit application. Please try again.';
        console.error('Submission error:', error);
      }
    }, 1500);
  }

  // Payment accordion methods
  togglePaymentAccordion(method: string): void {
    if (method === 'mtn') {
      this.showMtnAccordion = !this.showMtnAccordion;
      this.showOrangeAccordion = false;
      this.showPaymentSteps = false;
      this.activePaymentMethod = this.showMtnAccordion ? 'mtn' : '';
    } else if (method === 'orange') {
      this.showOrangeAccordion = !this.showOrangeAccordion;
      this.showMtnAccordion = false;
      this.showPaymentSteps = false;
      this.activePaymentMethod = this.showOrangeAccordion ? 'orange' : '';
    }
  }

  // Copy tracking number to clipboard
  copyTrackingNumber(): void {
    if (this.application?.trackingNumber) {
      navigator.clipboard.writeText(this.application.trackingNumber).then(() => {
        this.successMessage = 'Tracking number copied to clipboard!';
        setTimeout(() => {
          this.successMessage = '';
        }, 2000);
      }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = this.application!.trackingNumber;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        this.successMessage = 'Tracking number copied to clipboard!';
        setTimeout(() => {
          this.successMessage = '';
        }, 2000);
      });
    }
  }

  // MTN Mobile Money payment process
  processMtnPayment(): void {
    if (this.mtnForm.invalid) {
      this.markFormGroupTouched(this.mtnForm);
      return;
    }

    this.selectedPaymentMethod = PaymentMethod.MTN_MONEY;
    this.showPaymentSteps = true;
    this.currentPaymentStep = 1;
    this.errorMessage = '';

    // Simulate MTN payment steps
    this.simulateMtnPaymentSteps();
  }

  private simulateMtnPaymentSteps(): void {
    const steps = this.mtnPaymentSteps;
    let currentStep = 0;

    const processStep = () => {
      if (currentStep < steps.length) {
        steps[currentStep].status = 'processing';
        
        setTimeout(() => {
          steps[currentStep].status = 'completed';
          currentStep++;
          
          if (currentStep < steps.length) {
            processStep();
          } else {
            this.finalizeMtnPayment();
          }
        }, 2000);
      }
    };

    processStep();
  }

  private finalizeMtnPayment(): void {
    this.isProcessingPayment = true;
    
    // 10s verification process
    setTimeout(() => {
      this.isProcessingPayment = false;
      this.paymentVerificationComplete = true;
      this.successMessage = 'Your payment has been processed successfully';
      this.paymentStatusPending = true;
      this.showPaymentSteps = false;

      this.completePaymentProcess();
    }, 10000);
  }

  // Orange Money payment process
  processOrangePayment(): void {
    if (this.orangeForm.invalid) {
      this.markFormGroupTouched(this.orangeForm);
      return;
    }

    this.selectedPaymentMethod = PaymentMethod.ORANGE_MONEY;
    this.showPaymentSteps = true;
    this.currentPaymentStep = 1;
    this.errorMessage = '';

    // Simulate Orange payment steps
    this.simulateOrangePaymentSteps();
  }

  private simulateOrangePaymentSteps(): void {
    const steps = this.orangePaymentSteps;
    let currentStep = 0;

    const processStep = () => {
      if (currentStep < steps.length) {
        steps[currentStep].status = 'processing';
        
        setTimeout(() => {
          steps[currentStep].status = 'completed';
          currentStep++;
          
          if (currentStep < steps.length) {
            processStep();
          } else {
            this.finalizeOrangePayment();
          }
        }, 2000);
      }
    };

    processStep();
  }

  private finalizeOrangePayment(): void {
    this.isProcessingPayment = true;
    
    // 10s verification process
    setTimeout(() => {
      this.isProcessingPayment = false;
      this.paymentVerificationComplete = true;
      this.successMessage = 'Your payment has been processed successfully';
      this.paymentStatusPending = true;
      this.showPaymentSteps = false;

      this.completePaymentProcess();
    }, 10000);
  }

  private completePaymentProcess(): void {
    if (!this.application) return;

    const totalAmount = this.calculateTotalAmount();

    this.applicationService.simulatePayment(
      this.application.id,
      totalAmount,
      this.selectedPaymentMethod
    ).subscribe({
      next: (payment) => {
        payment.status = PaymentStatus.PENDING;
        
        // After 70s, mark as completed
        setTimeout(() => {
          payment.status = PaymentStatus.COMPLETED;
          this.application!.status = ApplicationStatus.COMPLETED;
          this.paymentStatusPending = false;
          this.successMessage = 'Payment completed successfully!';
          
          setTimeout(() => {
            this.successMessage = '';
          }, 3000);
        }, 70000);
      },
      error: (error) => {
        this.isProcessingPayment = false;
        this.errorMessage = 'Payment processing failed. Please try again.';
        console.error('Payment error:', error);
      }
    });
  }

  // Move to next step after payment verification
  proceedToConfirmation(): void {
    if (this.paymentVerificationComplete) {
      this.currentStep = 3;
    }
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      if (control) {
        control.markAsTouched();
      }
    });
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
    return baseAmount;
  }

  getExpectedDeliveryTime(): string {
    return '1-2 business days';
  }

  // Format phone number for display
  formatPhoneNumber(phoneNumber: string): string {
    if (phoneNumber.startsWith('237')) {
      return phoneNumber.replace(/(\d{3})(\d{1})(\d{4})(\d{4})/, '$1 $2 $3 $4');
    }
    return phoneNumber.replace(/(\d{1})(\d{4})(\d{4})/, '$1 $2 $3');
  }

  // Reset payment states
  resetPaymentStates(): void {
    this.mtnPaymentSteps.forEach(step => step.status = 'pending');
    this.orangePaymentSteps.forEach(step => step.status = 'pending');
    this.showPaymentSteps = false;
    this.isProcessingPayment = false;
    this.paymentVerificationComplete = false;
    this.paymentStatusPending = false;
  }

  // Get current payment steps based on selected method
  getCurrentPaymentSteps() {
    return this.activePaymentMethod === 'mtn' ? this.mtnPaymentSteps : this.orangePaymentSteps;
  }
}