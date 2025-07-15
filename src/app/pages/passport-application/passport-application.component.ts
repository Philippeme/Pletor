import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {TranslateService} from '@ngx-translate/core';
import {ApplicationService} from '../../services/application.service';
import {AuthService} from '../../services/auth.service';
import {Application, ApplicationStatus, PaymentMethod, PaymentStatus} from '../../models/application.model';
import {ApplicantType} from '../../models/service.model';
import {ApiService} from "../../services/api.service";

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
  totalSteps = 5;
  isLoading = false;
  isSubmitting = false;
  errorMessage = '';
  successMessage = '';

  // File upload properties
  uploadedFiles: { [key: string]: File } = {};
  requiredDocuments = [
    {id: 'birth_certificate', name: 'Certified Copy of Birth Certificate', required: true},
    {id: 'national_id', name: 'National Identity Card Copy', required: true},
    {id: 'passport_photos', name: '12 Passport Photos', required: true},
    {id: 'residence_proof', name: 'Proof of Residence', required: true},
    {id: 'marriage_certificate', name: 'Marriage Certificate (if married)', required: false}
  ];

  // Payment properties
  selectedPaymentMethod: PaymentMethod = PaymentMethod.MTN_MONEY;
  paymentMethods = [
    {value: PaymentMethod.MTN_MONEY, label: 'MTN Mobile Money', icon: 'fas fa-mobile-alt'},
    {value: PaymentMethod.ORANGE_MONEY, label: 'Orange Money', icon: 'fas fa-mobile-alt'},
    {value: PaymentMethod.CREDIT_CARD, label: 'Credit Card', icon: 'fas fa-credit-card'},
    {value: PaymentMethod.BANK_TRANSFER, label: 'Bank Transfer', icon: 'fas fa-university'}
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
      nationality: [' Bissau-Guinean', Validators.required],
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

  // Rendre cette méthode publique pour l'utiliser dans le template
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
      const body: any = this.passportForm.value
      //procedure_id most be the value of current procedure
      this.apiService.post<any>('/requests', {...body, procedure_id: 1}).subscribe({
        next: (data: any) => {
          this.isLoading = false;
          this.request = data;
          const requestId = data.id; // ← récupération de l'ID
          const formData:any = new FormData();
          Object.keys(this.uploadedFiles).forEach(key => {
            formData.append(key, this.uploadedFiles[key]);
          });
          this.apiService.post(`/requests/${requestId}/upload`, formData).subscribe({
            next: () => alert('Files uploaded successfully'),
            error: err => console.error('Upload failed', err)
          });
        },
        error: err => {
          this.isLoading = false;
          console.error('Request creation failed', err);
        }
      });
      // Simulate form submission
      setTimeout(() => {
        this.application!.status = ApplicationStatus.SUBMITTED;
        this.isSubmitting = false;
        this.successMessage = 'Application submitted successfully!';
        this.currentStep = 4; // Move to payment step
      }, 2000);
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

  onPayment(): void {
    if (this.application) {
      this.isLoading = true;
      this.errorMessage = '';

      this.applicationService.simulatePayment(
        this.application.id,
        110000, // Passport fee in XAF
        this.selectedPaymentMethod
      ).subscribe({
        next: (payment) => {
          //paidAmount
          //Most be the value of the total cost of the current procedure

          this.isLoading = false;
          this.apiService.patch(`/requests/${this.request.id}/status`, {paymentStatus:PaymentStatus.COMPLETED,status:PaymentStatus.COMPLETED,paidAmount:110000}).subscribe({
            next: () => {
              this.successMessage = 'Payment completed successfully!';
              this.currentStep = 5; // Move to confirmation step
            },
            error: (error:any) => {
              this.isLoading = false;
              this.errorMessage = 'Payment failed. Please try again.';
            }
          });
        },
      });
    }
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
}
