import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {TranslateService} from '@ngx-translate/core';
import {ApplicationService} from '../../services/application.service';
import {AuthService} from '../../services/auth.service';
import {Application, ApplicationStatus, PaymentMethod, PaymentStatus} from '../../models/application.model';
import {ApplicantType} from '../../models/service.model';
import {ApiService} from "../../services/api.service";

interface MTNPaymentData {
  phoneNumber: string;
  merchantCode: string;
}

interface OrangePaymentData {
  phoneNumber: string;
  merchantCode: string;
}

interface CardPaymentData {
  cardNumber: string;
  cardholderName: string;
  expiryDate: string;
  cvv: string;
}

@Component({
  selector: 'app-passport-application',
  templateUrl: './passport-application.component.html',
  styleUrls: ['./passport-application.component.scss']
})
export class PassportApplicationComponent implements OnInit {
  application: Application | null = null;
  passportForm: FormGroup;
  request: any;
  currentStep = 1;
  totalSteps = 6;
  isLoading = false;
  isSubmitting = false;
  errorMessage = '';
  successMessage = '';

  // Payment processing properties
  isProcessingPayment = false;
  selectedPaymentMethod: string = '';
  paymentStatus: 'pending' | 'processing' | 'completed' | null = null;

  // Payment method data
  mtnPaymentData: MTNPaymentData = {
    phoneNumber: '',
    merchantCode: 'MKGOV001'
  };

  orangePaymentData: OrangePaymentData = {
    phoneNumber: '',
    merchantCode: 'MKGOV002'
  };

  cardPaymentData: CardPaymentData = {
    cardNumber: '',
    cardholderName: '',
    expiryDate: '',
    cvv: ''
  };

  // Payment process tracking
  mtnStep = 0;
  orangeStep = 0;
  showMtnProcess = false;
  showOrangeProcess = false;

  // File upload properties
  uploadedFiles: { [key: string]: File } = {};
  requiredDocuments = [
    {id: 'birth_certificate', name: 'Certified Copy of Birth Certificate', required: true},
    {id: 'national_id', name: 'National Identity Card Copy', required: true},
    {id: 'passport_photos', name: '12 Passport Photos', required: true},
    {id: 'residence_proof', name: 'Proof of Residence', required: true},
    {id: 'marriage_certificate', name: 'Marriage Certificate (if married)', required: false}
  ];

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
        1, // passport service ID (numeric)
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
      default:
        this.currentStep = 1;
    }
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
      case 1: // Personal Information
        const personalFields = ['firstName', 'lastName', 'dateOfBirth', 'placeOfBirth', 'gender', 'maritalStatus'];
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
    if (this.passportForm.valid && this.application) {
      this.isSubmitting = true;
      this.errorMessage = '';
      const body: any = this.passportForm.value;
      
      this.apiService.post<any>('/requests', {...body, procedure_id: 1}).subscribe({
        next: (data: any) => {
          this.isSubmitting = false;
          this.request = data;
          const requestId = data.id;
          const formData: any = new FormData();
          Object.keys(this.uploadedFiles).forEach(key => {
            formData.append(key, this.uploadedFiles[key]);
          });
          this.apiService.post(`/requests/${requestId}/upload`, formData).subscribe({
            next: () => {
              this.successMessage = 'Application submitted successfully!';
              this.currentStep = 4; // Move to payment step
            },
            error: err => console.error('Upload failed', err)
          });
        },
        error: err => {
          this.isSubmitting = false;
          console.error('Request creation failed', err);
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.passportForm.controls).forEach(key => {
      const control = this.passportForm.get(key);
      if (control) {
        control.markAsTouched();
      }
    });
  }

  // Payment Methods
  selectPaymentMethod(method: string): void {
    this.selectedPaymentMethod = method;
    this.resetPaymentSteps();
    
    // Show payment process steps based on selected method
    if (method === 'MTN_MONEY') {
      this.showMtnProcess = true;
      this.showOrangeProcess = false;
    } else if (method === 'ORANGE_MONEY') {
      this.showOrangeProcess = true;
      this.showMtnProcess = false;
    } else {
      this.showMtnProcess = false;
      this.showOrangeProcess = false;
    }
  }

  private resetPaymentSteps(): void {
    this.mtnStep = 0;
    this.orangeStep = 0;
  }

  processPayment(method: string): void {
    if (!this.validatePaymentData(method)) {
      this.errorMessage = 'Please fill in all required payment information.';
      return;
    }

    this.isProcessingPayment = true;
    this.errorMessage = '';
    this.paymentStatus = 'pending';

    // Simulate payment process steps
    if (method === 'MTN_MONEY') {
      this.simulateMTNPayment();
    } else if (method === 'ORANGE_MONEY') {
      this.simulateOrangePayment();
    } else if (method === 'CREDIT_CARD') {
      this.simulateCardPayment();
    }
  }

  private validatePaymentData(method: string): boolean {
    switch (method) {
      case 'MTN_MONEY':
        return this.mtnPaymentData.phoneNumber.length >= 8;
      case 'ORANGE_MONEY':
        return this.orangePaymentData.phoneNumber.length >= 8;
      case 'CREDIT_CARD':
        return this.isCardFormValid();
      default:
        return false;
    }
  }

  isCardFormValid(): boolean {
    return this.cardPaymentData.cardNumber.length >= 16 &&
           this.cardPaymentData.cardholderName.length > 0 &&
           this.cardPaymentData.expiryDate.length === 5 &&
           this.cardPaymentData.cvv.length >= 3;
  }

  private simulateMTNPayment(): void {
    // Step 1: Dial *126#
    setTimeout(() => {
      this.mtnStep = 1;
    }, 1000);

    // Step 2: Select option 3
    setTimeout(() => {
      this.mtnStep = 2;
    }, 2000);

    // Step 3: Enter merchant code
    setTimeout(() => {
      this.mtnStep = 3;
    }, 3000);

    // Step 4: Enter amount
    setTimeout(() => {
      this.mtnStep = 4;
    }, 4000);

    // Step 5: Enter PIN and complete
    setTimeout(() => {
      this.mtnStep = 5;
      this.completePayment();
    }, 6000);
  }

  private simulateOrangePayment(): void {
    // Step 1: Dial #150#
    setTimeout(() => {
      this.orangeStep = 1;
    }, 1000);

    // Step 2: Select option 3
    setTimeout(() => {
      this.orangeStep = 2;
    }, 2000);

    // Step 3: Enter merchant code
    setTimeout(() => {
      this.orangeStep = 3;
    }, 3000);

    // Step 4: Enter amount
    setTimeout(() => {
      this.orangeStep = 4;
    }, 4000);

    // Step 5: Enter secret code and complete
    setTimeout(() => {
      this.orangeStep = 5;
      this.completePayment();
    }, 6000);
  }

  private simulateCardPayment(): void {
    // Simulate card payment processing
    setTimeout(() => {
      this.completePayment();
    }, 5000);
  }

  private completePayment(): void {
    // 10-second loading simulation as requested
    setTimeout(() => {
      this.paymentStatus = 'processing';
      
      // Update payment status to Processing after 30s
      setTimeout(() => {
        this.paymentStatus = 'processing';
        this.updateBackendPaymentStatus('processing');
        
        // Update payment status to Completed after 50s
        setTimeout(() => {
          this.paymentStatus = 'completed';
          this.isProcessingPayment = false;
          this.updateBackendPaymentStatus('completed');
          this.successMessage = 'Votre paiement a bien été effectué. Rendez-vous au centre de production de passeport agréé de votre choix pour la capture de vos données biométriques.';
        }, 20000); // Additional 20s (total 50s)
        
      }, 30000); // 30s for processing
      
    }, 10000); // Initial 10s loading
  }

  private updateBackendPaymentStatus(status: string): void {
    if (this.request) {
      const paymentData = {
        paymentStatus: status,
        status: status,
        paidAmount: 110000,
        paymentMethod: this.selectedPaymentMethod,
        paymentReference: this.generatePaymentReference()
      };

      this.apiService.patch(`/requests/${this.request.id}/status`, paymentData).subscribe({
        next: (response) => {
          console.log('Payment status updated:', response);
        },
        error: (error) => {
          console.error('Failed to update payment status:', error);
        }
      });
    }
  }

  private generatePaymentReference(): string {
    const prefix = this.selectedPaymentMethod === 'MTN_MONEY' ? 'MTN' : 
                   this.selectedPaymentMethod === 'ORANGE_MONEY' ? 'OM' : 'CC';
    return `${prefix}${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
  }

  confirmBiometricStep(): void {
    this.currentStep = 5;
  }

  goToTracking(): void {
    if (this.application) {
      this.router.navigate(['/search-files'], {
        queryParams: {trackingNumber: this.application.trackingNumber}
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

  // Card formatting methods
  formatCardNumber(event: any): void {
    let value = event.target.value.replace(/\D/g, '');
    value = value.replace(/(\d{4})(?=\d)/g, '$1 ');
    this.cardPaymentData.cardNumber = value;
  }

  formatExpiryDate(event: any): void {
    let value = event.target.value.replace(/\D/g, '');
    if (value.length >= 2) {
      value = value.substring(0, 2) + '/' + value.substring(2, 4);
    }
    this.cardPaymentData.expiryDate = value;
  }
}