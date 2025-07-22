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
    isApplicationReady = false;

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

    // NOUVEAU: Biometric submission processing states
    isProcessingBiometric = false;
    biometricSubmissionComplete = false;
    hasBiometricSubmitted = false;
    showBiometricRefreshButton = false;
    biometricProcessingStartTime = 0;
    showBiometricInstructions = true; // Contrôle l'affichage des instructions

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
            this.isApplicationReady = true;
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
          1,
          'Passport Application',
          ApplicantType.SELF,
          currentUser.id!
        ).subscribe({
          next: (application) => {
            this.application = application;
            this.isApplicationReady = true;
            console.log('Application created successfully:', application);
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

      if (this.application.timeline && this.application.timeline.length > 0) {
        const completedSteps = this.application.timeline.filter(step => step.isCompleted).length;
        const inProgressStep = this.application.timeline.find(step => step.status === 'in_progress');
        
        if (inProgressStep) {
          const inProgressIndex = this.application.timeline.indexOf(inProgressStep);
          this.currentStep = inProgressIndex + 1;
        } else if (completedSteps > 0) {
          this.currentStep = Math.min(completedSteps + 1, this.totalSteps);
        } else {
          this.currentStep = 1;
        }
      } else {
        switch (this.application.status) {
          case ApplicationStatus.DRAFT:
            this.currentStep = 1;
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
        
        this.passportForm.patchValue({
          relationshipToApplicant: '',
          guardianPhone: ''
        });
      } else if (requestType === 'child') {
        this.passportForm.get('relationshipToApplicant')?.setValidators([Validators.required]);
        this.passportForm.get('guardianPhone')?.setValidators([Validators.required]);
      }
      
      this.passportForm.get('relationshipToApplicant')?.updateValueAndValidity();
      this.passportForm.get('guardianPhone')?.updateValueAndValidity();
    }

    // Méthode mise à jour pour utiliser les traductions
  getPersonSectionTitle(): string {
    const requestType = this.passportForm.get('requestType')?.value;
    return requestType === 'self' 
      ? this.translate.instant('passport_application.form.your_information')
      : this.translate.instant('passport_application.form.child_information');
  }

    nextStep(): void {
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
          const personalFields = ['requestType', 'firstName', 'lastName', 'dateOfBirth', 'placeOfBirth', 'gender', 'maritalStatus'];
          if (this.passportForm.get('requestType')?.value === 'child') {
            personalFields.push('relationshipToApplicant', 'guardianPhone');
          }
          return this.validateFields(personalFields);
          
        case 2:
          const contactFields = ['phoneNumber', 'email', 'currentAddress', 'permanentAddress',
            'emergencyContactName', 'emergencyContactPhone', 'emergencyContactRelation'];
          return this.validateFields(contactFields);
          
        case 3:
          // Validation spéciale pour l'étape 3 - vérification des documents
          return this.validateDocumentUploads();
          
        default:
          return true;
      }
    }

    private validateFields(fieldNames: string[]): boolean {
      let isValid = true;
      const invalidFields: string[] = [];
      
      fieldNames.forEach(fieldName => {
        const control = this.passportForm.get(fieldName);
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

    validateDocumentUploads(): boolean {
      const requiredDocs = this.requiredDocuments.filter(doc => doc.required);
      const uploadedRequiredDocs = requiredDocs.filter(doc => this.uploadedFiles[doc.id]);
      
      console.log('Validating documents...');
      console.log('Required documents:', requiredDocs.map(d => d.id));
      console.log('Uploaded files:', Object.keys(this.uploadedFiles));
      console.log('Uploaded required docs:', uploadedRequiredDocs.length, '/', requiredDocs.length);
      
      if (uploadedRequiredDocs.length !== requiredDocs.length) {
        const missingDocs = requiredDocs
          .filter(doc => !this.uploadedFiles[doc.id])
          .map(doc => doc.name);
        this.errorMessage = `Please upload the following required documents: ${missingDocs.join(', ')}`;
        return false;
      }
      
      this.errorMessage = '';
      return true;
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
        
        // Forcer la re-validation après upload
        setTimeout(() => {
          this.validateDocumentUploads();
        }, 100);
        
        console.log(`File uploaded for ${documentId}:`, file.name);
      }
    }

    removeFile(documentId: string): void {
      delete this.uploadedFiles[documentId];
      console.log(`File removed for ${documentId}`);
    }

    onSubmitApplication(): void {
      if (!this.isApplicationReady || !this.application) {
        this.errorMessage = 'Application not ready. Please wait.';
        return;
      }

      // Validation des documents uniquement pour l'étape 3
      if (!this.validateDocumentUploads()) {
        return;
      }

      // Vérification basique des champs obligatoires du formulaire
      if (!this.passportForm.get('firstName')?.value || 
          !this.passportForm.get('lastName')?.value || 
          !this.passportForm.get('email')?.value) {
        this.errorMessage = 'Please complete the basic information fields.';
        return;
      }

      this.isSubmitting = true;
      this.errorMessage = '';
      
      setTimeout(() => {
        try {
          if (this.application) {
            this.application.status = ApplicationStatus.PAYMENT_PENDING;
            
            this.request = {
              id: 'req-' + Date.now(),
              procedure_id: 1,
              data: this.passportForm.value,
              documents: Object.keys(this.uploadedFiles),
              status: 'submitted'
            };

            this.isSubmitting = false;
            this.successMessage = 'Application submitted successfully!';
            
            this.currentStep = 4;
            this.updatePaymentAmounts();
            this.syncApplicationProgress();
            
            setTimeout(() => {
              this.successMessage = '';
            }, 2000);
          }
        } catch (error) {
          this.isSubmitting = false;
          this.errorMessage = 'Failed to submit application. Please try again.';
          console.error('Submission error:', error);
        }
      }, 1500);
    }

    private validateStepFields(stepNumber: number): boolean {
      switch (stepNumber) {
        case 1:
          const personalFields = ['requestType', 'firstName', 'lastName', 'dateOfBirth', 'placeOfBirth', 'gender', 'maritalStatus'];
          if (this.passportForm.get('requestType')?.value === 'child') {
            personalFields.push('relationshipToApplicant', 'guardianPhone');
          }
          return this.validateFields(personalFields);
          
        case 2:
          const contactFields = ['phoneNumber', 'email', 'currentAddress', 'permanentAddress',
            'emergencyContactName', 'emergencyContactPhone', 'emergencyContactRelation'];
          return this.validateFields(contactFields);
          
        case 3:
          return this.validateDocumentUploads();
          
        default:
          return true;
      }
    }

    // Méthode pour déterminer l'état du bouton "Proceed with Payment"
    shouldDisableProceedButton(): boolean {
      return this.isSubmitting || !this.validateDocumentUploads();
    }

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

    processMtnPayment(): void {
      if (this.mtnForm.invalid) {
        this.markFormGroupTouched(this.mtnForm);
        return;
      }

      this.selectedPaymentMethod = PaymentMethod.MTN_MONEY;
      this.initiatePaymentProcess();
    }

    processOrangePayment(): void {
      if (this.orangeForm.invalid) {
        this.markFormGroupTouched(this.orangeForm);
        return;
      }

      this.selectedPaymentMethod = PaymentMethod.ORANGE_MONEY;
      this.initiatePaymentProcess();
    }

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
      
      if (elapsedTime >= 30000) {
        this.isProcessingPayment = false;
        this.showRefreshButton = false;
        this.hasPaymentCompleted = true;
        this.paymentVerificationComplete = true;
        this.paymentStatusPending = false;
        
        this.showMtnAccordion = false;
        this.showOrangeAccordion = false;
        this.showVisaAccordion = false;
        this.activePaymentMethod = '';
        
        this.successMessage = '';
        
        this.completePaymentProcess();
      } else {
        const remainingTime = Math.ceil((30000 - elapsedTime) / 1000);
        
        if (this.currentStep === 4 && !this.hasPaymentCompleted) {
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
          
          if (this.request) {
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
          }
        },
        error: (error) => {
          this.isProcessingPayment = false;
          this.errorMessage = 'Payment processing failed. Please try again.';
          console.error('Payment error:', error);
        }
      });
    }

    private markFormGroupTouched(formGroup: FormGroup): void {
      Object.keys(formGroup.controls).forEach(key => {
        const control = formGroup.get(key);
        if (control) {
          control.markAsTouched();
        }
      });
    }

    proceedToBiometric(): void {
      if (this.paymentVerificationComplete) {
        this.currentStep = 5;
        this.successMessage = '';
        this.errorMessage = '';

        // Ne pas initier automatiquement - seul le clic sur le bouton doit déclencher l'action
        this.syncApplicationProgress();
      }
    }

    // NOUVELLE MÉTHODE: Initier le processus de soumission biométrique
    initiateBiometricSubmissionProcess(): void {
      this.isProcessingBiometric = true;
      this.showBiometricRefreshButton = true;
      this.biometricProcessingStartTime = Date.now();
      this.errorMessage = '';
      this.successMessage = 'Biometric submission initiated. Please click Submit to confirm your biometric enrollment request.';
    }

    // NOUVELLE MÉTHODE: Soumettre la demande biométrique
    submitBiometricRequest(): void {
      if (!this.isApplicationReady || !this.application) {
        this.errorMessage = 'Application not ready. Please wait.';
        return;
      }

      // Initier le processus de soumission biométrique uniquement au clic
      this.isProcessingBiometric = true;
      this.showBiometricRefreshButton = true;
      this.biometricProcessingStartTime = Date.now();
      this.errorMessage = '';
      this.successMessage = 'Your biometric enrollment request has been submitted and is being processed...';
    }

    // NOUVELLE MÉTHODE: Rafraîchir le statut de soumission biométrique
    refreshBiometricStatus(): void {
      const elapsedTime = Date.now() - this.biometricProcessingStartTime;
      
      if (elapsedTime >= 30000) { 
        this.isProcessingBiometric = false;
        this.showBiometricRefreshButton = false;
        this.hasBiometricSubmitted = true;
        this.biometricSubmissionComplete = true;
        this.showBiometricInstructions = false; // Masquer les instructions
        
        this.successMessage = '';
        
        this.completeBiometricSubmissionProcess();
      } else {
        const remainingTime = Math.ceil((30000 - elapsedTime) / 1000);

        if (this.currentStep === 5 && !this.hasBiometricSubmitted) {
          this.successMessage = `Biometric submission is being processed. Please wait ${remainingTime} more seconds before refreshing.`;
        }
      }
    }

    // NOUVELLE MÉTHODE: Compléter le processus de soumission biométrique
    private completeBiometricSubmissionProcess(): void {
      if (!this.application) return;

      // Mettre à jour le statut de l'application
      this.application.status = ApplicationStatus.PROCESSING;
      
      // Message de confirmation
      this.successMessage = '';
      this.errorMessage = '';
      
      this.syncApplicationProgress();
    }

    // NOUVELLE MÉTHODE: Vérifier si le bloc de traitement biométrique doit être affiché
    shouldShowBiometricProcessing(): boolean {
      return this.currentStep === 5 && !this.hasBiometricSubmitted;
    }

    // NOUVELLE MÉTHODE: Vérifier si le message de confirmation doit être affiché
    shouldShowBiometricConfirmation(): boolean {
      return this.currentStep === 5 && this.hasBiometricSubmitted && this.biometricSubmissionComplete;
    }

    getAppointmentDate(): string {
      const today = new Date();
      let appointmentDate = new Date(today);
      let daysAdded = 0;
      let businessDaysAdded = 0;

      while (businessDaysAdded < 3) {
        daysAdded++;
        appointmentDate = new Date(today.getTime() + (daysAdded * 24 * 60 * 60 * 1000));
        
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
      if (this.application?.trackingNumber) {
        return this.application.trackingNumber.slice(-8);
      }
      return Date.now().toString().slice(-8);
    }

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
      this.syncApplicationProgress();
    }

    private syncApplicationProgress(): void {
      if (this.application && this.application.id) {
        this.applicationService.updateApplicationStep(
          this.application.id,
          this.currentStep,
          1
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
      return 110000;
    }

    arePaymentMethodsDisabled(): boolean {
      return this.hasPaymentCompleted;
    }

    creditCardValidator(control: any) {
      const value = control.value;
      if (!value) return null;
      
      const cleanValue = value.replace(/\s/g, '');
      const isValid = /^[0-9]{16}$/.test(cleanValue);
      
      return isValid ? null : { creditCard: true };
    }

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