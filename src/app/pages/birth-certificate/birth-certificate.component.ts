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
  isApplicationReady = false; 
  
  // Payment processing states
  isProcessingPayment = false;
  paymentVerificationComplete = false;
  paymentStatusPending = false;
  showPaymentSteps = false;
  currentPaymentStep = 1;
  hasPaymentCompleted = false; 
  showRefreshButton = false; 
  paymentProcessingStartTime = 0;
  
  // Accordion states
  activePaymentMethod = '';
  showMtnAccordion = false;
  showOrangeAccordion = false;
  showVisaAccordion = false; 

  // Payment properties
  selectedPaymentMethod: PaymentMethod = PaymentMethod.MTN_MONEY;
  paymentMethods = [
    { value: PaymentMethod.MTN_MONEY, label: 'MTN Mobile Money', icon: 'fas fa-mobile-alt' },
    { value: PaymentMethod.ORANGE_MONEY, label: 'Orange Money', icon: 'fas fa-mobile-alt' },
    { value: PaymentMethod.CREDIT_CARD, label: 'Visa Credit Card', icon: 'fas fa-credit-card' }
  ];

  // MTN Mobile Money form
  mtnForm: FormGroup;
  // Orange Money form
  orangeForm: FormGroup;
  // Visa Credit Card form
  visaForm: FormGroup;
  
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

  visaPaymentSteps = [
    { step: 1, title: 'Enter Card Details', description: 'Enter your Visa card information', status: 'pending' },
    { step: 2, title: 'Verify Transaction', description: 'Confirm transaction details', status: 'pending' },
    { step: 3, title: 'Processing Payment', description: 'Processing your card payment', status: 'pending' },
    { step: 4, title: 'Payment Confirmation', description: 'Receiving confirmation from bank', status: 'pending' }
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

    // MTN Mobile Money form - updated pattern for new format
    this.mtnForm = this.fb.group({
      phoneNumber: ['', [Validators.required, Validators.pattern(/^(237)?6[0-9]{8}$/)]],
      merchantCode: [{ value: '634826', disabled: true }],
      transactionId: ['', [Validators.required, Validators.pattern(/^[0-9]{11}$/)]],
      amount: [{ value: '', disabled: true }, Validators.required]
    });

    // Orange Money form - updated pattern for new format
    this.orangeForm = this.fb.group({
      phoneNumber: ['', [Validators.required, Validators.pattern(/^(237)?6[0-9]{8}$/)]],
      merchantCode: [{ value: '78945', disabled: true }],
      transactionId: ['', [Validators.required, Validators.pattern(/^[A-Z]{2}[0-9]{6}\.[0-9]{4}\.[A-Z][0-9]{5}$/)]],
      amount: [{ value: '', disabled: true }, Validators.required]
    });

    // New Visa Credit Card form
    this.visaForm = this.fb.group({
      cardNumber: ['', [Validators.required, this.creditCardValidator]],
      expiryDate: ['', [Validators.required, Validators.pattern(/^(0[1-9]|1[0-2])\/[0-9]{2}$/)]],
      cvv: ['', [Validators.required, Validators.pattern(/^[0-9]{3}$/)]],
      cardholderName: ['', Validators.required],
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
    this.visaForm.patchValue({ amount: amount });
  }

  private loadApplication(applicationId: string): void {
    this.applicationService.getApplicationById(applicationId).subscribe({
      next: (application) => {
        if (application) {
          this.application = application;
          this.isApplicationReady = true; // CORRIGÉ: Marquer comme prêt
          this.determineCurrentStep();
        } else {
          this.errorMessage = 'Application not found.';
          this.isApplicationReady = false;
        }
      },
      error: (error) => {
        console.error('Error loading application:', error);
        this.errorMessage = 'Failed to load application details.';
        this.isApplicationReady = false;
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
          this.isApplicationReady = true; 
          console.log('Birth certificate application created successfully:', application);
        },
        error: (error) => {
          console.error('Error creating application:', error);
          this.errorMessage = 'Failed to create application.';
          this.isApplicationReady = false;
        }
      });
    } else {
      this.errorMessage = 'User not authenticated.';
      this.isApplicationReady = false;
    }
  }

  private prefillUserData(): void {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.certificateForm.patchValue({
        emailAddress: currentUser.email,
        personFirstName: currentUser.firstName || '',
        personLastName: currentUser.lastName || '',
        userIdentificationNumber: currentUser.cniNumber || currentUser.consularCardNumber || ''
      });

      // Prefill cardholder name for Visa form
      this.visaForm.patchValue({
        cardholderName: `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim()
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
    // CORRIGÉ: Vérifier que l'application est prête avant de continuer
    if (!this.isApplicationReady || !this.application) {
      this.errorMessage = 'Please wait for the application to load.';
      return;
    }

    if (this.currentStep < this.totalSteps) {
      if (this.validateCurrentStep()) {
        this.currentStep++;
        this.errorMessage = '';
        this.syncApplicationProgress();
      }
    }
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.errorMessage = '';
      this.syncApplicationProgress();
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
    // CORRIGÉ: Vérifications plus robustes
    if (!this.isApplicationReady || !this.application) {
      this.errorMessage = 'Application not ready. Please wait for the application to load completely.';
      return;
    }

    if (!this.validateCurrentStep()) {
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';
    
    setTimeout(() => {
      try {
        this.application!.status = ApplicationStatus.PAYMENT_PENDING;
        this.isSubmitting = false;
        this.successMessage = 'Application submitted successfully!';
        this.currentStep = 2; // Move to payment step
        this.updatePaymentAmounts();
        
        this.syncApplicationProgress();
        
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
    // Prevent opening if payment is already completed
    if (this.hasPaymentCompleted) {
      return;
    }

    if (method === 'mtn') {
      this.showMtnAccordion = !this.showMtnAccordion;
      this.showOrangeAccordion = false;
      this.showVisaAccordion = false;
      this.showPaymentSteps = false;
      this.activePaymentMethod = this.showMtnAccordion ? 'mtn' : '';
    } else if (method === 'orange') {
      this.showOrangeAccordion = !this.showOrangeAccordion;
      this.showMtnAccordion = false;
      this.showVisaAccordion = false;
      this.showPaymentSteps = false;
      this.activePaymentMethod = this.showOrangeAccordion ? 'orange' : '';
    } else if (method === 'visa') {
      this.showVisaAccordion = !this.showVisaAccordion;
      this.showMtnAccordion = false;
      this.showOrangeAccordion = false;
      this.showPaymentSteps = false;
      this.activePaymentMethod = this.showVisaAccordion ? 'visa' : '';
    }
  }

  // Copy tracking number to clipboard
  copyTrackingNumber(): void {
    if (this.application?.trackingNumber) {
      navigator.clipboard.writeText(this.application.trackingNumber).then(() => {
       
      }).catch(() => {
        const textArea = document.createElement('textarea');
        textArea.value = this.application!.trackingNumber;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);

      });

      const button = document.querySelector('.tracking-info .btn i') as HTMLElement;
        if (button) {
          button.className = 'fas fa-check';
          // Reset icon after 2 seconds
          setTimeout(() => {
            button.className = 'fas fa-copy';
          }, 2000);
        }
    }
  }

  // MTN Mobile Money payment process
  processMtnPayment(): void {
    if (this.mtnForm.invalid) {
      this.markFormGroupTouched(this.mtnForm);
      return;
    }

    this.selectedPaymentMethod = PaymentMethod.MTN_MONEY;
    this.initiatePaymentProcess();
  }

  // Orange Money payment process
  processOrangePayment(): void {
    if (this.orangeForm.invalid) {
      this.markFormGroupTouched(this.orangeForm);
      return;
    }

    this.selectedPaymentMethod = PaymentMethod.ORANGE_MONEY;
    this.initiatePaymentProcess();
  }

  // Visa Credit Card payment process
  processVisaPayment(): void {
    if (this.visaForm.invalid) {
      this.markFormGroupTouched(this.visaForm);
      return;
    }

    this.selectedPaymentMethod = PaymentMethod.CREDIT_CARD;
    this.initiatePaymentProcess();
  }

  // New unified payment initiation method
  private initiatePaymentProcess(): void {
    this.isProcessingPayment = true;
    this.showRefreshButton = true;
    this.paymentProcessingStartTime = Date.now();
    this.errorMessage = '';
    this.successMessage = 'Payment processing initiated. Please wait...';
  }

  // New refresh payment method
  refreshPaymentStatus(): void {
    const elapsedTime = Date.now() - this.paymentProcessingStartTime;
    
    if (elapsedTime >= 30000) { // 40 seconds have passed
      this.isProcessingPayment = false;
      this.showRefreshButton = false;
      this.hasPaymentCompleted = true;
      this.paymentVerificationComplete = true;
      this.paymentStatusPending = false;
      
      // Close all accordions
      this.showMtnAccordion = false;
      this.showOrangeAccordion = false;
      this.showVisaAccordion = false;
      this.activePaymentMethod = '';

      this.successMessage = '';
      
      this.completePaymentProcess();
    } else {
      const remainingTime = Math.ceil((30000 - elapsedTime) / 1000);
      if (this.currentStep === 2 && !this.hasPaymentCompleted) {
      this.successMessage = `Payment is still processing. Please wait ${remainingTime} more seconds before refreshing.`;
      }
    }
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
        payment.status = PaymentStatus.COMPLETED;
        this.application!.status = ApplicationStatus.PROCESSING;
        
        this.syncApplicationProgress();
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
      this.syncApplicationProgress();
    }
  }

  /**
   * Synchronise l'état d'avancement avec ApplicationService
   */
  private syncApplicationProgress(): void {
    if (this.application) {
      this.applicationService.updateApplicationStep(
        this.application.id,
        this.currentStep,
        4 // serviceId pour birth certificate
      ).subscribe({
        next: (success) => {
          if (success) {
            console.log(`Birth Certificate progress synced: Step ${this.currentStep}/3`);
          }
        },
        error: (error) => {
          console.error('Failed to sync birth certificate progress:', error);
        }
      });
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
    this.visaPaymentSteps.forEach(step => step.status = 'pending');
    this.showPaymentSteps = false;
    this.isProcessingPayment = false;
    this.paymentVerificationComplete = false;
    this.paymentStatusPending = false;
    this.showRefreshButton = false;
    this.hasPaymentCompleted = false;
  }

  // Get current payment steps based on selected method
  getCurrentPaymentSteps() {
    switch (this.activePaymentMethod) {
      case 'mtn': return this.mtnPaymentSteps;
      case 'orange': return this.orangePaymentSteps;
      case 'visa': return this.visaPaymentSteps;
      default: return [];
    }
  }

  // Method to check if payment methods should be disabled
  arePaymentMethodsDisabled(): boolean {
    return this.hasPaymentCompleted;
  }

  // Auto-format Visa card number with spaces
  onCardNumberInput(event: any): void {
    let value = event.target.value.replace(/\D/g, ''); // Remove non-digits
    
    // Limit to 16 digits
    if (value.length > 16) {
      value = value.substring(0, 16);
    }
    
    // Add spaces every 4 digits
    const formattedValue = value.replace(/(\d{4})(?=\d)/g, '$1 ');
    
    // Update form control with the raw value (without spaces) for validation
    this.visaForm.patchValue({ cardNumber: value });
    
    // Update the input display value with spaces
    event.target.value = formattedValue;
  }

  // Custom validator for credit card (any 16 digits)
  creditCardValidator(control: any) {
    const value = control.value;
    if (!value) return null;
    
    // Remove spaces and check if it's exactly 16 digits
    const cleanValue = value.replace(/\s/g, '');
    const isValid = /^[0-9]{16}$/.test(cleanValue);
    
    return isValid ? null : { creditCard: true };
  }

  // Handle keypress for card number (only digits)
  onCardNumberKeypress(event: KeyboardEvent): boolean {
    const charCode = event.which ? event.which : event.keyCode;
    // Allow backspace, delete, tab, escape, enter
    if ([8, 9, 27, 13, 46].indexOf(charCode) !== -1 ||
        // Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
        (charCode === 65 && event.ctrlKey) ||
        (charCode === 67 && event.ctrlKey) ||
        (charCode === 86 && event.ctrlKey) ||
        (charCode === 88 && event.ctrlKey)) {
      return true;
    }
    // Ensure that it is a number and stop the keypress
    if (charCode < 48 || charCode > 57) {
      event.preventDefault();
      return false;
    }
    return true;
  }

  // Auto-format expiry date with slash
  onExpiryDateInput(event: any): void {
    let value = event.target.value.replace(/\D/g, ''); // Remove non-digits
    
    // Limit to 4 digits (MMYY)
    if (value.length > 4) {
      value = value.substring(0, 4);
    }
    
    // Add slash after month if we have at least 2 digits
    if (value.length >= 2) {
      const month = parseInt(value.substring(0, 2), 10);
      // Validate month (01-12)
      if (month >= 1 && month <= 12) {
        value = value.substring(0, 2) + '/' + value.substring(2);
      } else {
        // Invalid month, truncate to 1 digit
        value = value.substring(0, 1);
      }
    }
    
    // Update form control
    this.visaForm.patchValue({ expiryDate: value });
    
    // Update the input value
    event.target.value = value;
  }

  // Handle keypress for expiry date (only digits)
  onExpiryDateKeypress(event: KeyboardEvent): boolean {
    const charCode = event.which ? event.which : event.keyCode;
    // Allow backspace, delete, tab, escape, enter
    if ([8, 9, 27, 13, 46].indexOf(charCode) !== -1 ||
        // Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
        (charCode === 65 && event.ctrlKey) ||
        (charCode === 67 && event.ctrlKey) ||
        (charCode === 86 && event.ctrlKey) ||
        (charCode === 88 && event.ctrlKey)) {
      return true;
    }
    // Ensure that it is a number and stop the keypress
    if (charCode < 48 || charCode > 57) {
      event.preventDefault();
      return false;
    }
    return true;
  }

  // Handle keypress for CVV (only digits, max 3)
  onCvvKeypress(event: KeyboardEvent): boolean {
    const input = event.target as HTMLInputElement;
    const charCode = event.which ? event.which : event.keyCode;
    
    // Allow backspace, delete, tab, escape, enter
    if ([8, 9, 27, 13, 46].indexOf(charCode) !== -1 ||
        // Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
        (charCode === 65 && event.ctrlKey) ||
        (charCode === 67 && event.ctrlKey) ||
        (charCode === 86 && event.ctrlKey) ||
        (charCode === 88 && event.ctrlKey)) {
      return true;
    }
    
    // Prevent input if already 3 digits
    if (input.value.length >= 3) {
      event.preventDefault();
      return false;
    }
    
    // Ensure that it is a number
    if (charCode < 48 || charCode > 57) {
      event.preventDefault();
      return false;
    }
    return true;
  }
}