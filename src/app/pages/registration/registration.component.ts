import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../services/auth.service';
import { RegistrationData } from '../../models/user.model';

@Component({
  selector: 'app-registration',
  templateUrl: './registration.component.html',
  styleUrls: ['./registration.component.scss']
})
export class RegistrationComponent implements OnInit {
  registrationForm: FormGroup;
  currentStep = 1;
  totalSteps = 2; // We're not implementing OTP for now
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  showPassword = false;
  showConfirmPassword = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private translate: TranslateService
  ) {
    this.registrationForm = this.fb.group({
      accountType: ['local', Validators.required],
      cniNumber: [''],
      consularCardNumber: [''],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^[+]?[0-9]{8,15}$/)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
      acceptedTerms: [false, Validators.requiredTrue]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    this.onAccountTypeChange();
  }

  passwordMatchValidator(control: AbstractControl): { [key: string]: any } | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (!password || !confirmPassword) {
      return null;
    }

    return password.value !== confirmPassword.value ? { 'passwordMismatch': true } : null;
  }

  onAccountTypeChange(): void {
    const accountType = this.registrationForm.get('accountType')?.value;

    if (accountType === 'local') {
      this.registrationForm.get('cniNumber')?.setValidators([Validators.required, Validators.pattern(/^[0-9]{8,12}$/)]);
      this.registrationForm.get('consularCardNumber')?.clearValidators();
    } else {
      this.registrationForm.get('consularCardNumber')?.setValidators([Validators.required, Validators.pattern(/^[A-Z0-9]{8,15}$/)]);
      this.registrationForm.get('cniNumber')?.clearValidators();
    }

    this.registrationForm.get('cniNumber')?.updateValueAndValidity();
    this.registrationForm.get('consularCardNumber')?.updateValueAndValidity();
  }

  nextStep(): void {
    if (this.currentStep === 1) {
      // Validate step 1 fields
      const step1Fields = ['accountType', 'phoneNumber', 'email'];
      if (this.registrationForm.get('accountType')?.value === 'local') {
        step1Fields.push('cniNumber');
      } else {
        step1Fields.push('consularCardNumber');
      }

      let isStep1Valid = true;
      step1Fields.forEach(field => {
        const control = this.registrationForm.get(field);
        if (control && control.invalid) {
          control.markAsTouched();
          isStep1Valid = false;
        }
      });

      if (isStep1Valid) {
        this.currentStep = 2;
      }
    }
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  onSubmit(): void {
    if (this.registrationForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';

      const registrationData: RegistrationData = {
        accountType: this.registrationForm.value.accountType,
        cniNumber: this.registrationForm.value.cniNumber,
        consularCardNumber: this.registrationForm.value.consularCardNumber,
        phoneNumber: this.registrationForm.value.phoneNumber,
        email: this.registrationForm.value.email,
        password: this.registrationForm.value.password,
        confirmPassword: this.registrationForm.value.confirmPassword,
        acceptedTerms: this.registrationForm.value.acceptedTerms
      };

      this.authService.register(registrationData).subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.success) {
            this.successMessage = response.message;
            setTimeout(() => {
              this.router.navigate(['/home']);
            }, 2000);
          } else {
            this.errorMessage = response.message;
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = 'Registration failed. Please try again.';
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.registrationForm.controls).forEach(key => {
      const control = this.registrationForm.get(key);
      if (control) {
        control.markAsTouched();
      }
    });
  }

  togglePasswordVisibility(field: 'password' | 'confirmPassword'): void {
    if (field === 'password') {
      this.showPassword = !this.showPassword;
    } else {
      this.showConfirmPassword = !this.showConfirmPassword;
    }
  }
}