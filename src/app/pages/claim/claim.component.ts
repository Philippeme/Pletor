import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../services/auth.service';
import { ClaimService } from '../../services/claim.service';
import { 
  Claim, 
  ClaimType, 
  ClaimPriority, 
  ClaimCategory, 
  ClaimStatus 
} from '../../models/claim.model';

@Component({
  selector: 'app-claim',
  templateUrl: './claim.component.html',
  styleUrls: ['./claim.component.scss']
})
export class ClaimComponent implements OnInit {
  claimForm: FormGroup;
  currentStep = 1;
  totalSteps = 3;
  isSubmitting = false;
  errorMessage = '';
  successMessage = '';
  submittedClaim: Claim | null = null;

  // Enums for template
  ClaimType = ClaimType;
  ClaimPriority = ClaimPriority;
  ClaimCategory = ClaimCategory;

  // File uploads
  uploadedFiles: File[] = [];

  // Data options
  claimTypes = [
    { value: ClaimType.SERVICE_DELAY, label: 'Service Delay', icon: 'fas fa-clock' },
    { value: ClaimType.SERVICE_QUALITY, label: 'Bribe', icon: 'fas fa-hand-holding-usd' },
    { value: ClaimType.PAYMENT_ISSUE, label: 'Payment Issue', icon: 'fas fa-credit-card' },
    { value: ClaimType.DOCUMENT_ERROR, label: 'Doc Not Found', icon: 'fas fa-file-alt' },
    { value: ClaimType.STAFF_BEHAVIOR, label: 'Staff Behavior', icon: 'fas fa-user-tie' },
    { value: ClaimType.SYSTEM_ERROR, label: 'System Error', icon: 'fas fa-bug' },
    { value: ClaimType.OTHER, label: 'Other', icon: 'fas fa-question' }
  ];

  claimCategories = [
    { value: ClaimCategory.COMPLAINT, label: 'Complaint', description: 'Express dissatisfaction' },
    { value: ClaimCategory.SUGGESTION, label: 'Suggestion', description: 'Suggest improvements' },
    { value: ClaimCategory.COMPLIMENT, label: 'Compliment', description: 'Praise good service' },
    { value: ClaimCategory.INQUIRY, label: 'Inquiry', description: 'Ask questions' }
  ];

  claimPriorities = [
    { value: ClaimPriority.LOW, label: 'Low', color: 'success' },
    { value: ClaimPriority.MEDIUM, label: 'Medium', color: 'warning' },
    { value: ClaimPriority.HIGH, label: 'High', color: 'danger' },
    { value: ClaimPriority.URGENT, label: 'Urgent', color: 'dark' }
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private claimService: ClaimService,
    private translate: TranslateService
  ) {
    this.claimForm = this.fb.group({
      // Step 1: Basic Information
      claimCategory: ['', Validators.required],
      claimType: ['', Validators.required],
      priority: [ClaimPriority.MEDIUM, Validators.required],
      
      // Step 2: Details
      subject: ['', [Validators.required, Validators.minLength(10)]],
      description: ['', [Validators.required, Validators.minLength(20)]],
      applicationId: [''],
      serviceId: [''],
      
      // Contact preferences
      preferredContactMethod: ['email', Validators.required],
      phoneNumber: [''],
      email: ['']
    });
  }

  ngOnInit(): void {
    this.prefillUserData();
  }

  private prefillUserData(): void {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.claimForm.patchValue({
        email: currentUser.email,
        phoneNumber: currentUser.phoneNumber
      });
    }
  }

  nextStep(): void {
    if (this.validateCurrentStep()) {
      this.currentStep++;
    }
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  private validateCurrentStep(): boolean {
    this.errorMessage = '';
    
    switch (this.currentStep) {
      case 1:
        return this.validateFields(['claimCategory', 'claimType', 'priority']);
      case 2:
        return this.validateFields(['subject', 'description']);
      default:
        return true;
    }
  }

  private validateFields(fieldNames: string[]): boolean {
    let isValid = true;
    
    fieldNames.forEach(fieldName => {
      const control = this.claimForm.get(fieldName);
      if (control && control.invalid) {
        control.markAsTouched();
        isValid = false;
      }
    });

    if (!isValid) {
      this.errorMessage = 'Please complete all required fields correctly.';
    }

    return isValid;
  }

  onFileUpload(event: any): void {
    const files = Array.from(event.target.files) as File[];
    
    files.forEach(file => {
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'text/plain'];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (!allowedTypes.includes(file.type)) {
        this.errorMessage = 'Invalid file type. Please upload PDF, JPEG, PNG, or TXT files only.';
        return;
      }

      if (file.size > maxSize) {
        this.errorMessage = 'File size too large. Please upload files smaller than 5MB.';
        return;
      }

      this.uploadedFiles.push(file);
    });

    this.errorMessage = '';
  }

  removeFile(index: number): void {
    this.uploadedFiles.splice(index, 1);
  }

  onSubmitClaim(): void {
    if (!this.claimForm.valid) {
      this.markFormGroupTouched();
      this.errorMessage = 'Please complete all required fields.';
      return;
    }

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      this.errorMessage = 'You must be logged in to submit a claim.';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const claimData = {
      ...this.claimForm.value,
      userId: currentUser.id,
      attachments: this.uploadedFiles
    };

    this.claimService.submitClaim(claimData).subscribe({
      next: (claim) => {
        this.isSubmitting = false;
        this.submittedClaim = claim;
        this.currentStep = 3;
        this.successMessage = 'Claim submitted successfully!';
      },
      error: (error) => {
        this.isSubmitting = false;
        this.errorMessage = 'Failed to submit claim. Please try again.';
        console.error('Claim submission error:', error);
      }
    });
  }

  private markFormGroupTouched(): void {
    Object.keys(this.claimForm.controls).forEach(key => {
      const control = this.claimForm.get(key);
      if (control) {
        control.markAsTouched();
      }
    });
  }

  getClaimTypeIcon(type: ClaimType): string {
    const claimType = this.claimTypes.find(ct => ct.value === type);
    return claimType?.icon || 'fas fa-question';
  }

  getPriorityColor(priority: ClaimPriority): string {
    const priorityObj = this.claimPriorities.find(p => p.value === priority);
    return priorityObj?.color || 'secondary';
  }

  goToTracking(): void {
    if (this.submittedClaim) {
      this.router.navigate(['/claim-tracking'], {
        queryParams: { trackingNumber: this.submittedClaim.trackingNumber }
      });
    }
  }

  goToHome(): void {
    this.router.navigate(['/home']);
  }
}