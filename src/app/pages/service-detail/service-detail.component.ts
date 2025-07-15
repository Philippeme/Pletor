import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { ServicesDataService } from '../../services/services-data.service';
import { AuthService } from '../../services/auth.service';
import { Service } from '../../models/service.model';
import { ServiceModalComponent } from '../../components/modals/service-modal/service-modal.component';
import { LoginModalComponent } from '../../components/modals/login-modal/login-modal.component';

@Component({
  selector: 'app-service-detail',
  templateUrl: './service-detail.component.html',
  styleUrls: ['./service-detail.component.scss']
})
export class ServiceDetailComponent implements OnInit {
  service: Service | null = null;
  isLoading = false;
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private modalService: NgbModal,
    private servicesDataService: ServicesDataService,
    private authService: AuthService,
    private translate: TranslateService
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const serviceId = params['serviceId'];
      if (serviceId) {
        const serviceIdNum = parseInt(serviceId, 10);
        if (!isNaN(serviceIdNum)) {
          this.loadService(serviceIdNum);
        } else {
          this.errorMessage = 'Invalid service ID.';
          this.isLoading = false;
        }
      }
    });
  }

  private loadService(serviceId: number): void {
    this.servicesDataService.getServiceById(serviceId).subscribe({
      next: (service) => {
        this.service = service || null;
        this.isLoading = false;
        if (!service) {
          this.errorMessage = 'Service not found.';
        }
      },
      error: (error) => {
        console.error('Error loading service:', error);
        this.errorMessage = 'Failed to load service details.';
        this.isLoading = false;
      }
    });
  }

  onApplyForService(): void {
    if (!this.service) return;

    if (!this.authService.isAuthenticated()) {
      const loginModal = this.modalService.open(LoginModalComponent, {
        centered: true,
        backdrop: 'static'
      });

      loginModal.result.then((result) => {
        if (result === 'login_success') {
          this.openServiceModal();
        }
      });
    } else {
      this.openServiceModal();
    }
  }

  private openServiceModal(): void {
    if (!this.service) return;

    const modalRef = this.modalService.open(ServiceModalComponent, {
      centered: true,
      size: 'lg'
    });

    modalRef.componentInstance.service = this.service;
  }

  formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency === 'XAF' ? 'XAF' : currency,
      minimumFractionDigits: 0
    }).format(amount);
  }

  goBack(): void {
    window.history.back();
  }
}