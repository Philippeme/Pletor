import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-forgot-password-modal',
  templateUrl: './forgot-password-modal.component.html',
  styleUrls: ['./forgot-password-modal.component.scss']
})
export class ForgotPasswordModalComponent implements OnInit {
  forgotPasswordForm: FormGroup;
  isLoading = false;
  isCodeSent = false;
  successMessage = '';
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private activeModal: NgbActiveModal,
    private authService: AuthService,
    private translate: TranslateService
  ) {
    this.forgotPasswordForm = this.fb.group({
      identifier: ['', [Validators.required]]
    });
  }

  ngOnInit(): void { }

  onSubmit(): void {
    if (this.forgotPasswordForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';

      const identifier = this.forgotPasswordForm.get('identifier')?.value;

      this.authService.sendPasswordResetCode(identifier).subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.success) {
            this.isCodeSent = true;
            this.successMessage = response.message;
          } else {
            this.errorMessage = response.message;
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = 'Failed to send reset code. Please try again.';
        }
      });
    } else {
      this.forgotPasswordForm.get('identifier')?.markAsTouched();
    }
  }

  close(): void {
    this.activeModal.dismiss();
  }
}