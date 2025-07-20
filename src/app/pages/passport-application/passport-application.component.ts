import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { ApplicationService } from '../../services/application.service';
import { AuthService } from '../../services/auth.service';
import { Application, ApplicationStatus, PaymentMethod, PaymentStatus } from '../../models/application.model';
import { ApplicantType } from '../../models/service.model';
import { ApiService } from "../../services/api.service";

interface BiometricAppointment {
  center: string;
  date: Date;
  time: string;
  reference: string;
  phone: string;
}

@Component({
  selector: 'app-passport-application',
  templateUrl: './passport-application.component.html',
  styleUrls: ['./passport-application.component.scss']
})
export class PassportApplicationComponent implements OnInit {
  application: Application | null = null;
  passportForm: FormGroup;
  biometricForm: FormGroup;
  request: any;
  currentStep = 1;
  totalSteps = 6;
  isLoading = false;
  isSubmitting = false;
  errorMessage = '';
  successMessage = '';

  // File upload properties
  uploadedFiles: { [key: string]: File } = {};
  requiredDocuments = [
    { id: 'birth_certificate', name: 'Certified Copy of Birth Certificate', required: true },
    { id: 'national_id', name: 'National Identity Card Copy', required: true },
    { id: 'passport_photos', name: '12 Passport Photos', required: true },
    { id: 'residence_proof', name: 'Proof of Residence', required: true },
    { id: 'marriage_certificate', name: 'Marriage Certificate (if married)', required: false }
  ];

  // Payment processing states
  isProcessingPayment = false;
  paymentVerificationComplete = false;
  paymentStatusPending = false;
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

  // Payment forms
  mtnForm: FormGroup;
  orangeForm: FormGroup;
  visaForm: FormGroup;

  // Biometric appointment
  biometricAppointment: BiometricAppointment | null = null;
  isBookingAppointment = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private applicationService: ApplicationService,
    private authService: AuthService,
    private apiService: ApiService,
    private translate: TranslateService
  ) {
    this.passportForm = this.fb.group({
      // Request type (new)
      requestType: ['self', Validators.required],
      relationshipToApplicant: [''],
      guardianPhone: [''],

      // Personal Information
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      middleName: [''],
      dateOfBirth: ['', Validators.required],
      placeOfBirth: ['', Validators.required],
      nationality: ['Bissau-Guinean', Validators.required],
      gender: ['', Validators.required],
      maritalStatus: ['', Validators.required],

      // Contact Information
      phoneNumber: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      currentAddress: ['', Validators.required],
      permanentAddress: ['', Validators.required],

      // Emergency Contact
      emergencyContactName: ['', Validators.required],
      emergencyContactPhone: ['', Validators.required],
      emergencyContactRelation: ['', Validators.required],

      // Previous Passport Information (if applicable)
      hasPreviousPassport: [false],
      previousPassportNumber: [''],
      previousPassportIssueDate: [''],
      previousPassportExpiryDate: [''],

      // Collection Method
      collectionMethod: ['pickup', Validators.required],
      collectionAddress: ['']
    });

    // MTN Mobile Money form
    this.mtnForm = this.fb.group({
      phoneNumber: ['', [Validators.required, Validators.pattern(/^(237)?6[0-9]{8}$/)]],
      merchantCode: [{ value: '634826', disabled: true }],
      transactionId: ['', [Validators.required, Validators.pattern(/^[0-9]{11}$/)]],
      amount: [{ value: '', disabled: true }, Validators.required]
    });

    // Orange Money form
    this.orangeForm = this.fb.group({
      phoneNumber: ['', [Validators.required, Validators.pattern(/^(237)?6[0-9]{8}$/)]],
      merchantCode: [{ value: '78945', disabled: true }],
      transactionId: ['', [Validators.required, Validators.pattern(/^[A-Z]{2}[0-9]{6}\.[0-9]{4}\.[A-Z][0-9]{5}$/)]],
      amount: [{ value: '', disabled: true }, Validators.required]
    });

    // Visa Credit Card form
    this.visaForm = this.fb.group({
      cardNumber: ['', [Validators.required, this.creditCardValidator]],
      expiryDate: ['', [Validators.required, Validators.pattern(/^(0[1-9]|1[0-2])\/[0-9]{2}$/)]],
      cvv: ['', [Validators.required, Validators.pattern(/^[0-9]{3}$/)]],
      cardholderName: ['', Validators.required],
      amount: [{ value: '', disabled: true }, Validators.required]
    });

    // Biometric appointment form
    this.biometricForm = this.fb.group({
      enrollmentCenter: ['', Validators.required],
      appointmentDate: ['', Validators.required],
      appointmentTime: ['', Validators.required],
      contactPhone: ['', Validators.required]
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
        1,
        'Passport Application',
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
      this.passportForm.patchValue({
        phoneNumber: currentUser.phoneNumber,
        email: currentUser.email,
        firstName: currentUser.firstName || '',
        lastName: currentUser.lastName || ''
      });

      // Prefill contact phone for biometric form
      this.biometricForm.patchValue({
        contactPhone: currentUser.phoneNumber
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
        this.currentStep = 3;
        break;
      case ApplicationStatus.PAYMENT_PENDING:
        this.currentStep = 4;
        break;
      case ApplicationStatus.PROCESSING:
        this.currentStep = 5;
        break;
      case ApplicationStatus.COMPLETED:
      this.currentStep = 6;
      break;
      default:
        this.currentStep = 1;
    }
  }

  // Request type change handler
  onRequestTypeChange(): void {
    const requestType = this.passportForm.get('requestType')?.value;
    const currentUser = this.authService.getCurrentUser();

    if (requestType === 'self' && currentUser) {
      this.passportForm.patchValue({
        firstName: currentUser.firstName || '',
        lastName: currentUser.lastName || '',
        email: currentUser.email
      });
      
      // Clear child-specific fields
      this.passportForm.patchValue({
        relationshipToApplicant: '',
        guardianPhone: ''
      });
    } else if (requestType === 'child') {
      // Set validation for child-specific fields
      this.passportForm.get('relationshipToApplicant')?.setValidators([Validators.required]);
      this.passportForm.get('guardianPhone')?.setValidators([Validators.required]);
    }
    
    this.passportForm.get('relationshipToApplicant')?.updateValueAndValidity();
    this.passportForm.get('guardianPhone')?.updateValueAndValidity();
  }

  // Get section title based on request type
  getPersonSectionTitle(): string {
    const requestType = this.passportForm.get('requestType')?.value;
    return requestType === 'self' ? 'Your Information' : 'Child\'s Information';
  }

  nextStep(): void {
    if (this.currentStep < this.totalSteps) {
      if (this.validateCurrentStep()) {
        this.currentStep++;
        // Synchroniser avec ApplicationService
        this.syncApplicationProgress();
      }
    }
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
      // Synchroniser avec ApplicationService
      this.syncApplicationProgress();
    }
  }

  private validateCurrentStep(): boolean {
    switch (this.currentStep) {
      case 1: // Personal Information
        const personalFields = ['requestType', 'firstName', 'lastName', 'dateOfBirth', 'placeOfBirth', 'gender', 'maritalStatus'];
        if (this.passportForm.get('requestType')?.value === 'child') {
          personalFields.push('relationshipToApplicant', 'guardianPhone');
        }
        return this.validateFields(personalFields);
      case 2: // Contact & Emergency Information
        const contactFields = ['phoneNumber', 'email', 'currentAddress', 'permanentAddress',
          'emergencyContactName', 'emergencyContactPhone', 'emergencyContactRelation'];
        return this.validateFields(contactFields);
      case 3: // Document Upload
        return this.validateDocumentUploads();
      default:
        return true;
    }
  }

  private validateFields(fieldNames: string[]): boolean {
    let isValid = true;
    fieldNames.forEach(fieldName => {
      const control = this.passportForm.get(fieldName);
      if (control && control.invalid) {
        control.markAsTouched();
        isValid = false;
      }
    });
    return isValid;
  }

  validateDocumentUploads(): boolean {
    const requiredDocs = this.requiredDocuments.filter(doc => doc.required);
    const uploadedRequiredDocs = requiredDocs.filter(doc => this.uploadedFiles[doc.id]);
    return uploadedRequiredDocs.length === requiredDocs.length;
  }

  onFileUpload(event: any, documentId: string): void {
    const file = event.target.files[0];
    if (file) {
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (!allowedTypes.includes(file.type)) {
        this.errorMessage = 'Invalid file type. Please upload PDF, JPEG, or PNG files only.';
        return;
      }

      if (file.size > maxSize) {
        this.errorMessage = 'File size too large. Please upload files smaller than 5MB.';
        return;
      }

      this.uploadedFiles[documentId] = file;
      this.errorMessage = '';
    }
  }

  removeFile(documentId: string): void {
    delete this.uploadedFiles[documentId];
  }

  onSubmitApplication(): void {
    // Validate form and documents
    if (!this.passportForm.valid) {
      this.markFormGroupTouched(this.passportForm);
      this.errorMessage = 'Please complete all required fields.';
      return;
    }

    if (!this.validateDocumentUploads()) {
      this.errorMessage = 'Please upload all required documents before submitting.';
      return;
    }

    if (!this.application) {
      this.errorMessage = 'Application not found. Please try again.';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    
    // Simulate API call for demo purposes
    setTimeout(() => {
      try {
        // Update application status
        this.application!.status = ApplicationStatus.PAYMENT_PENDING;
        
        // Create mock request data
        this.request = {
          id: 'req-' + Date.now(),
          procedure_id: 1,
          data: this.passportForm.value,
          documents: Object.keys(this.uploadedFiles),
          status: 'submitted'
        };

        this.isSubmitting = false;
        this.successMessage = 'Application submitted successfully!';
        
        // Move to payment step
        this.currentStep = 4;
        this.updatePaymentAmounts();

        this.syncApplicationProgress();
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
        
      } catch (error) {
        this.isSubmitting = false;
        this.errorMessage = 'Failed to submit application. Please try again.';
        console.error('Submission error:', error);
      }
    }, 1500);

    /* Original API implementation (commented for demo):
    const body: any = this.passportForm.value;
    
    this.apiService.post<any>('/requests', { ...body, procedure_id: 1 }).subscribe({
      next: (data: any) => {
        this.request = data;
        const requestId = data.id;
        const formData: any = new FormData();
        Object.keys(this.uploadedFiles).forEach(key => {
          formData.append(key, this.uploadedFiles[key]);
        });
        this.apiService.post(`/requests/${requestId}/upload`, formData).subscribe({
          next: () => {
            this.isSubmitting = false;
            this.successMessage = 'Application submitted successfully!';
            this.currentStep = 4;
            this.updatePaymentAmounts();
          },
          error: err => {
            this.isSubmitting = false;
            this.errorMessage = 'Upload failed. Please try again.';
            console.error('Upload failed', err);
          }
        });
      },
      error: err => {
        this.isSubmitting = false;
        this.errorMessage = 'Request creation failed. Please try again.';
        console.error('Request creation failed', err);
      }
    });
    */
  }

  // Copy tracking number to clipboard
  copyTrackingNumber(): void {
    if (this.application?.trackingNumber) {
      navigator.clipboard.writeText(this.application.trackingNumber).then(() => {
     
        setTimeout(() => {
          this.successMessage = '';
        }, 2000);
      }).catch(() => {
        const textArea = document.createElement('textarea');
        textArea.value = this.application!.trackingNumber;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      
        setTimeout(() => {
          this.successMessage = '';
        }, 2000);
      });

      const button = document.querySelector('.tracking-info .btn i') as HTMLElement;
      if (button) {
        button.className = 'fas fa-check';
        setTimeout(() => {
          button.className = 'fas fa-copy';
        }, 2000);
      }
    }
  }

  // Payment accordion methods
  togglePaymentAccordion(method: string): void {
    if (this.hasPaymentCompleted) {
      return;
    }

    if (method === 'mtn') {
      this.showMtnAccordion = !this.showMtnAccordion;
      this.showOrangeAccordion = false;
      this.showVisaAccordion = false;
      this.activePaymentMethod = this.showMtnAccordion ? 'mtn' : '';
    } else if (method === 'orange') {
      this.showOrangeAccordion = !this.showOrangeAccordion;
      this.showMtnAccordion = false;
      this.showVisaAccordion = false;
      this.activePaymentMethod = this.showOrangeAccordion ? 'orange' : '';
    } else if (method === 'visa') {
      this.showVisaAccordion = !this.showVisaAccordion;
      this.showMtnAccordion = false;
      this.showOrangeAccordion = false;
      this.activePaymentMethod = this.showVisaAccordion ? 'visa' : '';
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

  private initiatePaymentProcess(): void {
    this.isProcessingPayment = true;
    this.showRefreshButton = true;
    this.paymentProcessingStartTime = Date.now();
    this.errorMessage = '';
    this.successMessage = 'Payment processing initiated. Please wait...';
  }

  refreshPaymentStatus(): void {
    const elapsedTime = Date.now() - this.paymentProcessingStartTime;
    
    if (elapsedTime >= 40000) { // 40 seconds have passed
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
      
      this.completePaymentProcess();
    } else {
      const remainingTime = Math.ceil((40000 - elapsedTime) / 1000);
      // Only show message if still on payment step
      if (this.currentStep === 4) {
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
        
        // NOUVEAU: Synchroniser après paiement
        this.syncApplicationProgress();
        
        this.apiService.patch(`/requests/${this.request.id}/status`, {
          paymentStatus: PaymentStatus.COMPLETED,
          status: PaymentStatus.COMPLETED,
          paidAmount: totalAmount
        }).subscribe({
          next: () => {
            this.successMessage = 'Payment completed successfully!';
          },
          error: (error: any) => {
            console.error('Payment status update failed:', error);
          }
        });
      },
      error: (error) => {
        this.isProcessingPayment = false;
        this.errorMessage = 'Payment processing failed. Please try again.';
        console.error('Payment error:', error);
      }
    });
  }

  // Unified markFormGroupTouched method - FIXED VERSION
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      if (control) {
        control.markAsTouched();
      }
    });
  }

  // Move to biometric step after payment
  proceedToBiometric(): void {
    if (this.paymentVerificationComplete) {
      this.currentStep = 5;
      this.successMessage = ''; // Clear any payment messages
      this.errorMessage = ''; // Clear any error messages

      // NOUVEAU: Synchroniser l'état avec ApplicationService
      this.syncApplicationProgress();
    }
  }

  // Biometric appointment methods - Auto-generated appointment
  getAppointmentDate(): string {
    const today = new Date();
    let appointmentDate = new Date(today);
    let daysAdded = 0;
    let businessDaysAdded = 0;

    // Add 3 business days (excluding Saturday and Sunday)
    while (businessDaysAdded < 3) {
      daysAdded++;
      appointmentDate = new Date(today.getTime() + (daysAdded * 24 * 60 * 60 * 1000));
      
      // Check if it's not Saturday (6) or Sunday (0)
      if (appointmentDate.getDay() !== 0 && appointmentDate.getDay() !== 6) {
        businessDaysAdded++;
      }
    }

    return appointmentDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  generateAppointmentReference(): string {
    // Generate a consistent reference based on application tracking number
    if (this.application?.trackingNumber) {
      return this.application.trackingNumber.slice(-8);
    }
    return Date.now().toString().slice(-8);
  }

  // Biometric appointment methods
  getMinAppointmentDate(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }

  getEnrollmentCenterName(centerCode: string): string {
    const centers: { [key: string]: string } = {
      'bissau-central': 'DGSN Bissau - Central Office',
      'bissau-airport': 'DGSN Bissau - Airport Office',
      'bafata': 'DGSN Bafatá Regional Office',
      'gabu': 'DGSN Gabú Regional Office',
      'cacheu': 'DGSN Cacheu Regional Office'
    };
    return centers[centerCode] || centerCode;
  }

  formatAppointmentDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  proceedToCollection(): void {
    this.currentStep = 6;

    // NOUVEAU: Synchroniser l'état avec ApplicationService
    this.syncApplicationProgress();
  }

  /**
   * NOUVELLE MÉTHODE: Synchronise l'état d'avancement avec ApplicationService
   */
  private syncApplicationProgress(): void {
  if (this.application && this.application.id) {
    this.applicationService.updateApplicationStep(
      this.application.id,
      this.currentStep,
      1 // serviceId pour passport
    ).subscribe({
      next: (success) => {
        if (success) {
          console.log(`Passport progress synced: Step ${this.currentStep}/6`);
        }
      },
      error: (error) => {
        console.error('Failed to sync passport progress:', error);
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

  calculateAge(dateOfBirth: string): number {
    if (!dateOfBirth) return 0;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  calculateTotalAmount(): number {
    return 110000; // Passport fee in XAF
  }

  // Payment method helpers
  arePaymentMethodsDisabled(): boolean {
    return this.hasPaymentCompleted;
  }

  // Custom validator for credit card
  creditCardValidator(control: any) {
    const value = control.value;
    if (!value) return null;
    
    const cleanValue = value.replace(/\s/g, '');
    const isValid = /^[0-9]{16}$/.test(cleanValue);
    
    return isValid ? null : { creditCard: true };
  }

  // Auto-format Visa card number with spaces
  onCardNumberInput(event: any): void {
    let value = event.target.value.replace(/\D/g, '');
    
    if (value.length > 16) {
      value = value.substring(0, 16);
    }
    
    const formattedValue = value.replace(/(\d{4})(?=\d)/g, '$1 ');
    
    this.visaForm.patchValue({ cardNumber: value });
    event.target.value = formattedValue;
  }

  onCardNumberKeypress(event: KeyboardEvent): boolean {
    const charCode = event.which ? event.which : event.keyCode;
    if ([8, 9, 27, 13, 46].indexOf(charCode) !== -1 ||
        (charCode === 65 && event.ctrlKey) ||
        (charCode === 67 && event.ctrlKey) ||
        (charCode === 86 && event.ctrlKey) ||
        (charCode === 88 && event.ctrlKey)) {
      return true;
    }
    if (charCode < 48 || charCode > 57) {
      event.preventDefault();
      return false;
    }
    return true;
  }

  onExpiryDateInput(event: any): void {
    let value = event.target.value.replace(/\D/g, '');
    
    if (value.length > 4) {
      value = value.substring(0, 4);
    }
    
    if (value.length >= 2) {
      const month = parseInt(value.substring(0, 2), 10);
      if (month >= 1 && month <= 12) {
        value = value.substring(0, 2) + '/' + value.substring(2);
      } else {
        value = value.substring(0, 1);
      }
    }
    
    this.visaForm.patchValue({ expiryDate: value });
    event.target.value = value;
  }

  onExpiryDateKeypress(event: KeyboardEvent): boolean {
    const charCode = event.which ? event.which : event.keyCode;
    if ([8, 9, 27, 13, 46].indexOf(charCode) !== -1 ||
        (charCode === 65 && event.ctrlKey) ||
        (charCode === 67 && event.ctrlKey) ||
        (charCode === 86 && event.ctrlKey) ||
        (charCode === 88 && event.ctrlKey)) {
      return true;
    }
    if (charCode < 48 || charCode > 57) {
      event.preventDefault();
      return false;
    }
    return true;
  }

  onCvvKeypress(event: KeyboardEvent): boolean {
    const input = event.target as HTMLInputElement;
    const charCode = event.which ? event.which : event.keyCode;
    
    if ([8, 9, 27, 13, 46].indexOf(charCode) !== -1 ||
        (charCode === 65 && event.ctrlKey) ||
        (charCode === 67 && event.ctrlKey) ||
        (charCode === 86 && event.ctrlKey) ||
        (charCode === 88 && event.ctrlKey)) {
      return true;
    }
    
    if (input.value.length >= 3) {
      event.preventDefault();
      return false;
    }
    
    if (charCode < 48 || charCode > 57) {
      event.preventDefault();
      return false;
    }
    return true;
  }
}