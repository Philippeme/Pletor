import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { ServiceCategory, Service, DocumentType, ApplicantType } from '../models/service.model';
import { ApiService } from '../services/api.service';

@Injectable({
  providedIn: 'root'
})
export class ServicesDataService {

  constructor(private apiService: ApiService) {}

  private serviceCategories: ServiceCategory[] = [
    {
      id: 1,
      fname: 'Police & Justice',
      description: 'Identity documents, judicial records, and legal services',
      icon: 'fas fa-balance-scale',
      color: '#1a73e8',
      displayOrder: 1,
      isActive: true,
      procedures: [
        {
          id: 1,
          categoryId: 1,
          pname: 'Passport Application',
          shortdesc: 'Apply for a Cameroonian biometric passport online',
          longdesc: 'Electronic service for applying for a Cameroonian biometric passport. The application is processed by the General Delegation for National Security (DGSN) through their digital platform. The new biometric passport features advanced security technology with an integrated electronic chip and is internationally recognized.',
          documents: [
            {
              id: 1,
              name: 'Passport Application Form',
              description: 'Completed passport application form with accurate information',
              isRequired: true,
              documentType: DocumentType.FORM,
              type: 'input'
            },
            {
              id: 2,
              name: 'Birth Certificate',
              description: 'Certified copy of birth certificate (less than 3 months old)',
              isRequired: true,
              documentType: DocumentType.BIRTH_CERTIFICATE,
              type: 'input'
            },
            {
              id: 3,
              name: 'National Identity Card',
              description: 'Copy of valid national identity card or consular card',
              isRequired: true,
              documentType: DocumentType.IDENTITY,
              type: 'input'
            },
            {
              id: 4,
              name: 'Passport Photos',
              description: '12 standardized passport photos with white background',
              isRequired: true,
              documentType: DocumentType.PHOTO,
              type: 'input'
            },
            {
              id: 5,
              name: 'Proof of Residence',
              description: 'Recent utility bill or residence certificate from local administration',
              isRequired: true,
              documentType: DocumentType.RESIDENCE_PROOF,
              type: 'input'
            }
          ],
          processtime: '48 hours to 3 months',
          servicecost: 110000,
          currency: 'XAF',
          providingAdministration:  {
            id: 1,
            institutionName: 'General Delegation for National Security (DGSN)'
          },        
          legaltext: 'Loi N° 2016/007 du 12 juillet 2016 portant Code de la nationalité camerounaise. Décret N° 2019/286 du 29 mai 2019 fixant les modalités d\'établissement du passeport biométrique.',
          published: true,
          displayOrder: 1,
          isActive: true,
          canApplyFor: [ApplicantType.SELF, ApplicantType.CHILD]
        },
        {
          id: 4,
          categoryId: 1,
          pname: 'National Identity Card',
          shortdesc: 'Apply for national identity card',
          longdesc: 'Service for requesting a new national identity card or renewing an existing one. The CNI is a mandatory identity document for all Cameroonian citizens.',
          documents: [
            {
              id: 6,
              name: 'Birth Certificate',
              description: 'Certified copy of birth certificate (less than 3 months old)',
              isRequired: true,
              documentType: DocumentType.BIRTH_CERTIFICATE,
              type: 'input'
            },
            {
              id: 7,
              name: 'Passport Photos',
              description: '12 standardized passport photos with white background',
              isRequired: true,
              documentType: DocumentType.PHOTO,
              type: 'input'
            }
          ],
          processtime: '2-4 weeks',
          servicecost: 5000,
          currency: 'XAF',
          providingAdministration: {
            id: 2,
            institutionName: 'General Delegation for National Security (DGSN)'
          },
          published: false,
          displayOrder: 2,
          isActive: true,
          canApplyFor: [ApplicantType.SELF]
        },
        {
          id: 3,
          categoryId: 1,
          pname: 'Criminal Record Extract',
          shortdesc: 'Request criminal record extract',
          longdesc: 'Official document certifying the criminal history or clean record of an individual. Required for various administrative procedures including business registration and employment.',
          documents: [
            {
              id: 8,
              name: 'National Identity Card',
              description: 'Copy of valid national identity card or consular card',
              isRequired: true,
              documentType: DocumentType.IDENTITY,
              type: 'input'
            }
          ],
          processtime: '1-3 days',
          servicecost: 1000,
          currency: 'XAF',
          providingAdministration: {
            id: 3,
            institutionName: 'Ministry of Justice'
          },
          published: false,
          displayOrder: 3,
          isActive: true,
          canApplyFor: [ApplicantType.SELF]
        }
      ]
    },
    {
      id: 2,
      fname: 'Family',
      description: 'Civil status documents and family-related services',
      icon: 'fas fa-users',
      color: '#34a853',
      displayOrder: 2,
      isActive: true,
      procedures: [
        {
          id: 2,
          categoryId: 2,
          pname: 'Certified Copy of Birth Certificate',
          shortdesc: 'Request a certified copy of birth certificate',
          longdesc: 'Official service to obtain a certified copy of a birth certificate. The request is processed by the civil registry office where the birth was originally registered. This document is essential for various administrative procedures including passport applications, school enrollment, and legal proceedings.',
          documents: [
            {
              id: 9,
              name: 'Request Form',
              description: 'Completed request form for certified copy',
              isRequired: true,
              documentType: DocumentType.FORM,
              type: 'input'
            },
            {
              id: 10,
              name: 'Requester\'s ID',
              description: 'Valid identification document of the requester',
              isRequired: true,
              documentType: DocumentType.IDENTITY,
              type: 'input'
            }
          ],
          processtime: 'Immediate to 48 hours',
          servicecost: 1500,
          currency: 'XAF',
          providingAdministration: {
            id: 4,
            institutionName: 'Civil Registry Office'
          },
          legaltext: 'Ordonnance N° 81-02 du 29 juin 1981 portant organisation de l\'état civil',
          published: true,
          displayOrder: 1,
          isActive: true,
          canApplyFor: [ApplicantType.SELF, ApplicantType.OTHER]
        },
        {
          id: 5,
          categoryId: 2,
          pname: 'Marriage Certificate Copy',
          shortdesc: 'Request certified copy of marriage certificate',
          longdesc: 'Official copy of marriage certificate issued by the civil registry office.',
          documents: [
            {
              id: 11,
              name: 'Request Form',
              description: 'Completed request form for certified copy',
              isRequired: true,
              documentType: DocumentType.FORM,
              type: 'input'
            }
          ],
          processtime: 'Immediate to 24 hours',
          servicecost: 300,
          currency: 'XAF',
          providingAdministration: {
            id: 5,
            institutionName: 'Civil Registry Office'
          },
          published: false,
          displayOrder: 2,
          isActive: true,
          canApplyFor: [ApplicantType.SELF, ApplicantType.OTHER]
        },
        {
          id: 6,
          categoryId: 2,
          pname: 'Death Certificate Copy',
          shortdesc: 'Request certified copy of death certificate',
          longdesc: 'Official copy of death certificate issued by the civil registry office.',
          documents: [
            {
              id: 12,
              name: 'Request Form',
              description: 'Completed request form for certified copy',
              isRequired: true,
              documentType: DocumentType.FORM,
              type: 'input'
            }
          ],
          processtime: 'Immediate to 24 hours',
          servicecost: 300,
          currency: 'XAF',
          providingAdministration: {
            id: 6,
            institutionName: 'Civil Registry Office'
          },
          published: false,
          displayOrder: 3,
          isActive: true,
          canApplyFor: [ApplicantType.OTHER]
        }
      ]
    },
    {
      id: 3,
      fname: 'Transport',
      description: 'Driving licenses, vehicle registration, and transport permits',
      icon: 'fas fa-car',
      color: '#ff6d01',
      displayOrder: 3,
      isActive: true,
      procedures: [
        {
          id: 7,
          categoryId: 3,
          pname: 'Driving License',
          shortdesc: 'Apply for driving license',
          longdesc: 'Service for obtaining a driving license after passing the required theoretical and practical tests.',
          documents: [
            {
              id: 13,
              name: 'Driving License Application Form',
              description: 'Completed driving license application form',
              isRequired: true,
              documentType: DocumentType.FORM,
              type: 'input'
            },
            {
              id: 14,
              name: 'Medical Certificate',
              description: 'Medical fitness certificate from authorized physician',
              isRequired: true,
              documentType: DocumentType.AUTHORIZATION,
              type: 'input'
            }
          ],
          processtime: '2-4 weeks',
          servicecost: 25000,
          currency: 'XAF',
          providingAdministration: {
            id: 7,
            institutionName: 'Ministry of Transport'
          },
          published: false,
          displayOrder: 1,
          isActive: true,
          canApplyFor: [ApplicantType.SELF]
        }
      ]
    },
    {
      id: 4,
      fname: 'Education',
      description: 'Diploma certification, educational authorizations, and academic services',
      icon: 'fas fa-graduation-cap',
      color: '#9c27b0',
      displayOrder: 4,
      isActive: true,
      procedures: [
        {
          id: 8,
          categoryId: 4,
          pname: 'Diploma Certification',
          shortdesc: 'Certify academic diplomas',
          longdesc: 'Official certification of academic diplomas for use abroad or for professional purposes.',
          documents: [
            {
              id: 15,
              name: 'Original Diploma',
              description: 'Original diploma or certified copy for verification',
              isRequired: true,
              documentType: DocumentType.AUTHORIZATION,
              type: 'input'
            }
          ],
          processtime: '1-2 weeks',
          servicecost: 5000,
          currency: 'XAF',
          providingAdministration: {
            id: 8,
            institutionName: 'Ministry of Secondary Education'
          },
          published: false,
          displayOrder: 1,
          isActive: true,
          canApplyFor: [ApplicantType.SELF]
        }
      ]
    },
    {
      id: 5,
      fname: 'Business',
      description: 'Company registration, business permits, and commercial services',
      icon: 'fas fa-briefcase',
      color: '#607d8b',
      displayOrder: 5,
      isActive: true,
      procedures: [
        {
          id: 9,
          categoryId: 5,
          pname: 'Business Registration',
          shortdesc: 'Register a new business',
          longdesc: 'Complete business registration process including commercial registry inscription and tax registration.',
          documents: [
            {
              id: 16,
              name: 'Business Registration Form',
              description: 'Completed business registration application form',
              isRequired: true,
              documentType: DocumentType.FORM,
              type: 'input'
            }
          ],
          processtime: '1-2 weeks',
          servicecost: 50000,
          currency: 'XAF',
          providingAdministration: {
            id: 9,
            institutionName: 'Ministry of Commerce'
          },
          published: false,
          displayOrder: 1,
          isActive: true,
          canApplyFor: [ApplicantType.SELF]
        }
      ]
    },
    {
      id: 6,
      fname: 'Public Service',
      description: 'Civil service applications and administrative procedures',
      icon: 'fas fa-user-tie',
      color: '#795548',
      displayOrder: 6,
      isActive: true,
      procedures: [
        {
          id: 10,
          categoryId: 6,
          pname: 'Civil Service Application',
          shortdesc: 'Apply for civil service positions',
          longdesc: 'Application process for civil service competitions and government positions.',
          documents: [],
          processtime: '1-3 months',
          servicecost: 0,
          currency: 'XAF',
          providingAdministration: {
            id: 10,
            institutionName: 'Ministry of Public Service and Administrative Reform'
          },
          published: false,
          displayOrder: 1,
          isActive: true,
          canApplyFor: [ApplicantType.SELF]
        }
      ]
    },
    {
      id: 7,
      fname: 'Land & Construction',
      description: 'Land titles, building permits, and property certificates',
      icon: 'fas fa-home',
      color: '#4caf50',
      displayOrder: 7,
      isActive: true,
      procedures: [
        {
          id: 11,
          categoryId: 7,
          pname: 'Land Title',
          shortdesc: 'Obtain land title',
          longdesc: 'Process for obtaining official land ownership titles and property certificates.',
          documents: [],
          processtime: '3-6 months',
          servicecost: 100000,
          currency: 'XAF',
          providingAdministration: {
            id: 11,
            institutionName: 'Ministry of Land Affairs'
          },
          published: false,
          displayOrder: 1,
          isActive: true,
          canApplyFor: [ApplicantType.SELF]
        }
      ]
    },
    {
      id: 8,
      fname: 'Consular Services',
      description: 'Visa applications and document legalization',
      icon: 'fas fa-passport',
      color: '#2196f3',
      displayOrder: 8,
      isActive: true,
      procedures: [
        {
          id: 12,
          categoryId: 8,
          pname: 'Visa Application',
          shortdesc: 'Apply for travel visa',
          longdesc: 'Application process for travel visas to various countries through consular services.',
          documents: [],
          processtime: '1-4 weeks',
          servicecost: 50000,
          currency: 'XAF',
          providingAdministration: {
            id: 12,
            institutionName: 'Ministry of External Relations'
          },
          published: false,
          displayOrder: 1,
          isActive: true,
          canApplyFor: [ApplicantType.SELF]
        }
      ]
    },
    {
      id: 9,
      fname: 'Health',
      description: 'Healthcare facility authorizations and medical services',
      icon: 'fas fa-heartbeat',
      color: '#f44336',
      displayOrder: 9,
      isActive: true,
      procedures: [
        {
          id: 13,
          categoryId: 9,
          pname: 'Health Facility Authorization',
          shortdesc: 'Authorization to operate health facilities',
          longdesc: 'Licensing process for opening and operating healthcare facilities including clinics and pharmacies.',
          documents: [],
          processtime: '1-3 months',
          servicecost: 200000,
          currency: 'XAF',
          providingAdministration: {
            id: 13,
            institutionName: 'Ministry of Public Health'
          },
          published: false,
          displayOrder: 1,
          isActive: true,
          canApplyFor: [ApplicantType.SELF]
        }
      ]
    },
    {
      id: 10,
      fname: 'Civic Life',
      description: 'Event permits and civic activities authorization',
      icon: 'fas fa-flag',
      color: '#ff9800',
      displayOrder: 10,
      isActive: true,
      procedures: [
        {
          id: 14,
          categoryId: 10,
          pname: 'Event Authorization',
          shortdesc: 'Authorization for public events',
          longdesc: 'Permit application for organizing public events, demonstrations, and cultural activities.',
          documents: [],
          processtime: '1-2 weeks',
          servicecost: 10000,
          currency: 'XAF',
          providingAdministration: {
            id: 14,
            institutionName: 'Ministry of Territorial Administration'
          },
          published: false,
          displayOrder: 1,
          isActive: true,
          canApplyFor: [ApplicantType.SELF]
        }
      ]
    }
  ];

 getServiceCategories():  any {
  this.apiService.get<ServiceCategory[]>('/procedures').subscribe({
    next: (data) => {
      this.serviceCategories = data;
      console.log('Catégories:', data);
    },
    error: (err) => {
      console.error('Erreur de chargement:', err);
    }
  });
}
  getServicesByCategory(categoryId: number): Observable<Service[]> {
    const category = this.serviceCategories.find(cat => cat.id === categoryId);
    return of(category?.procedures || []);
  }

  getServiceById(serviceId: number): Observable<Service | undefined> {
    for (const category of this.serviceCategories) {
      const service = category.procedures.find(s => s.id === serviceId);
      if (service) {
        return of(service);
      }
    }
    return of(undefined);
  }

  searchServices(query: string): Observable<Service[]> {
    const results: Service[] = [];
    const searchTerm = query.toLowerCase();

    for (const category of this.serviceCategories) {
      for (const service of category.procedures) {
        if (service.pname.toLowerCase().includes(searchTerm) ||
          service.shortdesc.toLowerCase().includes(searchTerm) ||
          service.longdesc.toLowerCase().includes(searchTerm)) {
          results.push(service);
        }
      }
    }
    return of(results);
  }
}