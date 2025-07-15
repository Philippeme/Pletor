import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { ServicesDataService } from '../../services/services-data.service';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { ServiceCategory, Service } from '../../models/service.model';
import { ServiceModalComponent } from '../../components/modals/service-modal/service-modal.component';

@Component({
  selector: 'app-procedures',
  templateUrl: './procedures.component.html',
  styleUrls: ['./procedures.component.scss']
})
export class ProceduresComponent implements OnInit {
  serviceCategories: ServiceCategory[] = [];
  filteredServices: Service[] = [];
  selectedCategory: number | null = null;
  searchQuery = '';
  isLoading = false;
  viewMode: 'categories' | 'services' = 'categories';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private modalService: NgbModal,
    private servicesDataService: ServicesDataService,
    private authService: AuthService,
    private translate: TranslateService,
    private apiService: ApiService
  ) { }

  ngOnInit(): void {
    this.getServiceCategories();

    // Handle route parameters
    this.route.params.subscribe(params => {
      if (params['category']) {
        this.selectedCategory = parseInt(params['category'], 10);
        this.viewMode = 'services';
            this.loadServiceCategories(this.selectedCategory);

        console.log('Selected category:', this.selectedCategory);
      }
    });

    // Handle query parameters for search
    this.route.queryParams.subscribe(queryParams => {
      if (queryParams['search']) {
        this.searchQuery = queryParams['search'];
        this.performSearch();
      }
    });
  }

  getServiceCategories(): any {
  this.apiService.get<ServiceCategory[]>('/families/').subscribe({
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


    loadServiceCategories(id:number): any {
  this.apiService.get<ServiceCategory[]>('/families/'+id).subscribe({
    next: (data:any) => {
      this.filteredServices = data.procedures;
      console.log('Service categories loaded:', this.serviceCategories);
      this.isLoading = false;
    },
    error: (err) => {
      console.error('Erreur de chargement:', err);
    }
  });}



  onCategoryClick(categoryId: number): void {
    this.router.navigate(['/procedures', categoryId]);
  }

  onServiceClick(service: Service): void {
    if (service.published) {
      // Navigate to service detail page first
      this.router.navigate(['/service-detail', service.id]);
    } else {
      // Show modal for non-implemented services
      const modalRef = this.modalService.open(ServiceModalComponent, {
        centered: true,
        size: 'lg'
      });
      modalRef.componentInstance.service = service;
    }
  }

  onSearch(): void {
    if (this.searchQuery.trim()) {
      this.performSearch();
    } else {
      this.backToCategories();
    }
  }

  private performSearch(): void {
    this.isLoading = true;
    this.viewMode = 'services';

    this.servicesDataService.searchServices(this.searchQuery).subscribe({
      next: (services) => {
        this.filteredServices = services;
        this.selectedCategory = null;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error searching services:', error);
        this.isLoading = false;
      }
    });
  }

  backToCategories(): void {
    this.viewMode = 'categories';
    this.selectedCategory = null;
    this.filteredServices = [];
    this.searchQuery = '';
    this.router.navigate(['/procedures']);
  }

  getCategoryById(categoryId: number | null): ServiceCategory | undefined {
    if (!categoryId) {
      return undefined;
    }
    return this.serviceCategories.find(cat => cat.id === categoryId);
  }

  getCategoryIcon(icon: string): string {
    return icon || 'fas fa-cog';
  }

  // Helper method for template to safely get category name
  getCategoryName(categoryId: number | null): string {
    const category = this.getCategoryById(categoryId);
    return category ? category.fname : '';
  }
}