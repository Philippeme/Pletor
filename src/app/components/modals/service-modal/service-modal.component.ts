import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { Service, ApplicantType } from '../../../models/service.model';
import { AuthService } from '../../../services/auth.service';
import { ApplicationService } from '../../../services/application.service';

@Component({
  selector: 'app-service-modal',
  templateUrl: './service-modal.component.html',
  styleUrls: ['./service-modal.component.scss']
})
export class ServiceModalComponent implements OnInit {
  @Input() service!: Service;

  selectedApplicantType: ApplicantType = ApplicantType.SELF;
  applicantTypes = ApplicantType;
  isLoading = false;

  constructor(
    private activeModal: NgbActiveModal,
    private router: Router,
    private authService: AuthService,
    private applicationService: ApplicationService,
    private translate: TranslateService
  ) { }

  ngOnInit(): void {
    console.log('Service Modal Initialized', this.service);
   }

  onApply(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      this.activeModal.dismiss();
      return;
    }

    this.isLoading = true;

    this.applicationService.createApplication(
      this.service.id,
      this.service.pname,
      this.selectedApplicantType,
      currentUser.id!
    ).subscribe({
      next: (application) => {
        this.isLoading = false;
        this.activeModal.close('application_created');

        // Navigate to the appropriate service page using numeric IDs
        if (this.service.id === 1) { // passport
          this.router.navigate(['/passport-application'], {
            queryParams: { applicationId: application.id }
          });
        } else if (this.service.id === 2) { // birth-certificate-copy
          this.router.navigate(['/birth-certificate'], {
            queryParams: { applicationId: application.id }
          });
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error creating application:', error);
      }
    });
  }

  close(): void {
    this.activeModal.dismiss();
  }

  formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency === 'XAF' ? 'XAF' : currency,
      minimumFractionDigits: 0
    }).format(amount);
  }
}