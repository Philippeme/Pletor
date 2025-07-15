import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { ServicesDataService } from '../../services/services-data.service';
import { AuthService } from '../../services/auth.service';
import { ServiceCategory, Service } from '../../models/service.model';
import { ApiService } from '../../services/api.service';
import { ServiceModalComponent } from '../../components/modals/service-modal/service-modal.component';
import { LoginModalComponent } from '../../components/modals/login-modal/login-modal.component';
import { SubscriptionLoggable } from 'rxjs/internal/testing/SubscriptionLoggable';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  serviceCategories: ServiceCategory[]  = [];
  searchQuery = '';
  isLoading = false;

  constructor(
    private router: Router,
    private modalService: NgbModal,
    private servicesDataService: ServicesDataService,
    private authService: AuthService,
    private translate: TranslateService,
    private apiService: ApiService
  ) { }

  ngOnInit(): void {
    this.getServiceCategories();
  }

 getServiceCategories(): any {
  this.apiService.get<ServiceCategory[]>('/families').subscribe({
    next: (data:ServiceCategory[]) => {
      this.serviceCategories = data;
      console.log('Service categories loaded:', this.serviceCategories);
      this.isLoading = false;
    },
    error: (err) => {
      console.error('Erreur de chargement:', err);
    }
  });
}

  onServiceClick(service: Service): void {
    if (!this.authService.isAuthenticated()) {
      const loginModal = this.modalService.open(LoginModalComponent, {
        centered: true,
        backdrop: 'static'
      });

      loginModal.result.then((result) => {
        if (result === 'login_success') {
          this.openServiceModal(service);
        }
      });
    } else {
      this.openServiceModal(service);
    }
  }

  private openServiceModal(service: Service): void {
    const modalRef = this.modalService.open(ServiceModalComponent, {
      centered: true,
      size: 'lg'
    });

    modalRef.componentInstance.service = service;
  }

  onCategoryClick(categoryId: number): void {
    this.router.navigate(['/procedures', categoryId]);
  }

  onSearch(): void {
    if (this.searchQuery.trim()) {
      this.router.navigate(['/procedures'], {
        queryParams: { search: this.searchQuery.trim() }
      });
    }
  }

  getCategoryIcon(icon: string): string {
    return icon;
  }

  getPassportService(): Service | null {
    for (const category of this.serviceCategories) {
      const passportService = category.procedures.find((service: Service) => service.id === 1);
      if (passportService) {
        return passportService;
      }
    }
    return null;
  }
}