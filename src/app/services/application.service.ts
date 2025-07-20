import { Injectable } from '@angular/core';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import {
  Application,
  ApplicationStatus,
  Payment,
  PaymentMethod,
  PaymentStatus,
  ApplicationTimeline,
  TimelineStatus
} from '../models/application.model';
import { ApplicantType } from '../models/service.model';

@Injectable({
  providedIn: 'root'
})
export class ApplicationService {
  private applicationsSubject = new BehaviorSubject<Application[]>([]);
  public applications$ = this.applicationsSubject.asObservable();

  constructor() {
    this.loadApplications();
  }

  private loadApplications(): void {
    const savedApplications = localStorage.getItem('mk-gov-applications');
    if (savedApplications) {
      const applications = JSON.parse(savedApplications);
      applications.forEach((app: Application) => {
        app.submissionDate = new Date(app.submissionDate);
        if (app.completionDate) app.completionDate = new Date(app.completionDate);
        if (app.expectedCompletionDate) app.expectedCompletionDate = new Date(app.expectedCompletionDate);
        
        app.timeline.forEach((timeline: ApplicationTimeline) => {
          timeline.date = new Date(timeline.date);
        });
        
        app.payments.forEach((payment: Payment) => {
          payment.date = new Date(payment.date);
        });
      });
      this.applicationsSubject.next(applications);
    }
  }

  private saveApplications(applications: Application[]): void {
    localStorage.setItem('mk-gov-applications', JSON.stringify(applications));
    this.applicationsSubject.next(applications);
  }

  createApplication(serviceId: number, serviceName: string, applicantType: ApplicantType, userId: string): Observable<Application> {
    const newApplication: Application = {
      id: 'app-' + Date.now(),
      userId,
      serviceId,
      serviceName,
      applicantType,
      status: ApplicationStatus.DRAFT,
      submissionDate: new Date(),
      expectedCompletionDate: this.calculateExpectedCompletion(serviceId),
      documents: [],
      timeline: this.createServiceSpecificTimeline(serviceId),
      payments: [],
      trackingNumber: this.generateTrackingNumber()
    };

    const currentApplications = this.applicationsSubject.value;
    const updatedApplications = [...currentApplications, newApplication];
    this.saveApplications(updatedApplications);

    return of(newApplication).pipe(delay(500));
  }

  private createServiceSpecificTimeline(serviceId: number): ApplicationTimeline[] {
    const baseDate = new Date();
    
    if (serviceId === 1) { // Passport Application - Exact match with component steps
      return [
        {
          id: 'passport-step-1',
          step: 'Personal Information',
          status: TimelineStatus.IN_PROGRESS, // Start with first step active
          date: baseDate,
          description: 'Provide personal details as they appear on your birth certificate',
          isCompleted: false,
          estimatedDuration: '5-10 minutes'
        },
        {
          id: 'passport-step-2',
          step: 'Contact & Emergency Information',
          status: TimelineStatus.PENDING,
          date: baseDate,
          description: 'Provide your current contact details and emergency contact information',
          isCompleted: false,
          estimatedDuration: '5-10 minutes'
        },
        {
          id: 'passport-step-3',
          step: 'Document Upload',
          status: TimelineStatus.PENDING,
          date: baseDate,
          description: 'Upload all required documents: birth certificate, ID, photos, residence proof',
          isCompleted: false,
          estimatedDuration: '10-15 minutes'
        },
        {
          id: 'passport-step-4',
          step: 'Payment Processing',
          status: TimelineStatus.PENDING,
          date: baseDate,
          description: 'Complete payment of passport application fees (110,000 XAF)',
          isCompleted: false,
          estimatedDuration: '2-5 minutes'
        },
        {
          id: 'passport-step-5',
          step: 'Biometric Enrollment',
          status: TimelineStatus.PENDING,
          date: baseDate,
          description: 'Attend biometric appointment at DGSN center for fingerprints, photo capture, and signature',
          isCompleted: false,
          estimatedDuration: '20-30 minutes'
        },
        {
          id: 'passport-step-6',
          step: 'Passport Collection',
          status: TimelineStatus.PENDING,
          date: baseDate,
          description: 'Collect your completed biometric passport (48 hours after biometric enrollment)',
          isCompleted: false,
          estimatedDuration: '15 minutes'
        }
      ];
    } else if (serviceId === 4) { // Birth Certificate - Exact match with component steps
      return [
        {
          id: 'birth-step-1',
          step: 'Person Information',
          status: TimelineStatus.IN_PROGRESS, // Start with first step active
          date: baseDate,
          description: 'Provide details of the person whose birth certificate is being requested and request inputs',
          isCompleted: false,
          estimatedDuration: '5-10 minutes'
        },
        {
          id: 'birth-step-2',
          step: 'Payment Processing',
          status: TimelineStatus.PENDING,
          date: baseDate,
          description: 'Complete payment of birth certificate copy fees (200 XAF)',
          isCompleted: false,
          estimatedDuration: '2-5 minutes'
        },
        {
          id: 'birth-step-3',
          step: 'CRVS Processing & Delivery',
          status: TimelineStatus.PENDING,
          date: baseDate,
          description: 'Civil registry verification, certified copy preparation, and email delivery',
          isCompleted: false,
          estimatedDuration: '1-2 business days'
        }
      ];
    }
    
    // Default timeline for other services
    return [
      {
        id: 'default-step-1',
        step: 'Application Submission',
        status: TimelineStatus.IN_PROGRESS,
        date: baseDate,
        description: 'Complete and submit your application with required information',
        isCompleted: false,
        estimatedDuration: '10-20 minutes'
      },
      {
        id: 'default-step-2',
        step: 'Document Review',
        status: TimelineStatus.PENDING,
        date: baseDate,
        description: 'Review and verification of submitted documents',
        isCompleted: false,
        estimatedDuration: '1-3 business days'
      },
      {
        id: 'default-step-3',
        step: 'Processing',
        status: TimelineStatus.PENDING,
        date: baseDate,
        description: 'Administrative processing of your application',
        isCompleted: false,
        estimatedDuration: '5-10 business days'
      },
      {
        id: 'default-step-4',
        step: 'Completion',
        status: TimelineStatus.PENDING,
        date: baseDate,
        description: 'Final processing and document preparation',
        isCompleted: false,
        estimatedDuration: '1-2 business days'
      }
    ];
  }

  /**
   * NEW: Update application step based on component current step
   * This syncs the timeline with the actual progress in components
   */
  updateApplicationStep(applicationId: string, currentStep: number, serviceId: number): Observable<boolean> {
    const applications = this.applicationsSubject.value;
    const application = applications.find(app => app.id === applicationId);
    
    if (!application) return of(false);

    // Update timeline based on current step and service type
    if (serviceId === 1) { // Passport
      this.updatePassportTimeline(application, currentStep);
    } else if (serviceId === 4) { // Birth Certificate
      this.updateBirthCertificateTimeline(application, currentStep);
    }

    this.updateApplicationStatusFromTimeline(application);
    this.saveApplications(applications);
    
    return of(true).pipe(delay(300));
  }

  private updatePassportTimeline(application: Application, currentStep: number): void {
    const timeline = application.timeline;
    
    // Mark completed steps
    for (let i = 0; i < Math.min(currentStep - 1, timeline.length); i++) {
      timeline[i].status = TimelineStatus.COMPLETED;
      timeline[i].isCompleted = true;
      timeline[i].date = new Date();
    }
    
    // Mark current step as in progress
    if (currentStep <= timeline.length) {
      timeline[currentStep - 1].status = TimelineStatus.IN_PROGRESS;
      timeline[currentStep - 1].isCompleted = false;
      timeline[currentStep - 1].date = new Date();
    }
    
    // Keep future steps as pending
    for (let i = currentStep; i < timeline.length; i++) {
      timeline[i].status = TimelineStatus.PENDING;
      timeline[i].isCompleted = false;
    }
  }

  private updateBirthCertificateTimeline(application: Application, currentStep: number): void {
    const timeline = application.timeline;
    
    // Mark completed steps
    for (let i = 0; i < Math.min(currentStep - 1, timeline.length); i++) {
      timeline[i].status = TimelineStatus.COMPLETED;
      timeline[i].isCompleted = true;
      timeline[i].date = new Date();
    }
    
    // Mark current step as in progress
    if (currentStep <= timeline.length) {
      timeline[currentStep - 1].status = TimelineStatus.IN_PROGRESS;
      timeline[currentStep - 1].isCompleted = false;
      timeline[currentStep - 1].date = new Date();
    }
    
    // Keep future steps as pending
    for (let i = currentStep; i < timeline.length; i++) {
      timeline[i].status = TimelineStatus.PENDING;
      timeline[i].isCompleted = false;
    }
  }

  private calculateExpectedCompletion(serviceId: number): Date {
    const submissionDate = new Date();
    let daysToAdd = 7;

    switch (serviceId) {
      case 1: // Passport
        daysToAdd = 45;
        break;
      case 4: // Birth Certificate
        daysToAdd = 2;
        break;
      default:
        daysToAdd = 14;
    }

    const expectedDate = new Date(submissionDate);
    expectedDate.setDate(expectedDate.getDate() + daysToAdd);
    return expectedDate;
  }

  private generateTrackingNumber(): string {
    const prefix = 'MKG';
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  }

  updateApplicationTimeline(applicationId: string, stepId: string, status: TimelineStatus = TimelineStatus.COMPLETED): Observable<boolean> {
    const applications = this.applicationsSubject.value;
    const application = applications.find(app => app.id === applicationId);
    
    if (application) {
      const timeline = application.timeline;
      const stepIndex = timeline.findIndex(step => step.id === stepId);
      
      if (stepIndex >= 0) {
        timeline[stepIndex].status = status;
        timeline[stepIndex].isCompleted = status === TimelineStatus.COMPLETED;
        timeline[stepIndex].date = new Date();
        
        if (status === TimelineStatus.COMPLETED && stepIndex < timeline.length - 1) {
          timeline[stepIndex + 1].status = TimelineStatus.IN_PROGRESS;
        }
        
        this.updateApplicationStatusFromTimeline(application);
        this.saveApplications(applications);
        return of(true).pipe(delay(500));
      }
    }
    
    return of(false);
  }

  private updateApplicationStatusFromTimeline(application: Application): void {
    const timeline = application.timeline;
    const completedSteps = timeline.filter(step => step.isCompleted).length;
    const totalSteps = timeline.length;
    
    if (completedSteps === 0) {
      application.status = ApplicationStatus.DRAFT;
    } else if (completedSteps === 1) {
      application.status = ApplicationStatus.SUBMITTED;
    } else if (completedSteps < totalSteps) {
      const paymentStep = timeline.find(step => step.step.toLowerCase().includes('payment'));
      if (paymentStep && !paymentStep.isCompleted) {
        application.status = ApplicationStatus.PAYMENT_PENDING;
      } else {
        application.status = ApplicationStatus.PROCESSING;
      }
    } else {
      application.status = ApplicationStatus.COMPLETED;
      application.completionDate = new Date();
    }
  }

  simulatePayment(applicationId: string, amount: number, method: PaymentMethod): Observable<Payment> {
    const payment: Payment = {
      id: 'pay-' + Date.now(),
      amount,
      currency: 'XAF',
      description: this.getPaymentDescription(applicationId),
      method,
      status: PaymentStatus.PROCESSING,
      date: new Date(),
      referenceNumber: this.generatePaymentReference(),
      isSimulated: true
    };

    return of(payment).pipe(
      delay(this.getPaymentProcessingDelay(method)),
      map(() => {
        const isSuccessful = Math.random() > 0.05;
        payment.status = isSuccessful ? PaymentStatus.COMPLETED : PaymentStatus.FAILED;

        if (isSuccessful) {
          this.updateApplicationPayment(applicationId, payment);
          this.updatePaymentTimelineStep(applicationId);
        }

        return payment;
      })
    );
  }

  private updatePaymentTimelineStep(applicationId: string): void {
    const applications = this.applicationsSubject.value;
    const application = applications.find(app => app.id === applicationId);
    
    if (application) {
      const paymentStep = application.timeline.find(step => 
        step.step.toLowerCase().includes('payment')
      );
      
      if (paymentStep) {
        paymentStep.status = TimelineStatus.COMPLETED;
        paymentStep.isCompleted = true;
        paymentStep.date = new Date();
        
        const stepIndex = application.timeline.indexOf(paymentStep);
        if (stepIndex < application.timeline.length - 1) {
          application.timeline[stepIndex + 1].status = TimelineStatus.IN_PROGRESS;
        }
        
        this.updateApplicationStatusFromTimeline(application);
        this.saveApplications(applications);
      }
    }
  }

  private getPaymentDescription(applicationId: string): string {
    const application = this.applicationsSubject.value.find(app => app.id === applicationId);
    if (!application) return 'Service application fee';

    switch (application.serviceId) {
      case 1: return 'Biometric passport application fee';
      case 4: return 'Birth certificate copy certification fee';
      default: return 'Government service application fee';
    }
  }

  private getPaymentProcessingDelay(method: PaymentMethod): number {
    switch (method) {
      case PaymentMethod.MTN_MONEY:
      case PaymentMethod.ORANGE_MONEY:
        return 2000;
      case PaymentMethod.CREDIT_CARD:
        return 3000;
      case PaymentMethod.BANK_TRANSFER:
        return 5000;
      default:
        return 1000;
    }
  }

  private generatePaymentReference(): string {
    const prefix = 'PAY';
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  }

  private updateApplicationPayment(applicationId: string, payment: Payment): void {
    const applications = this.applicationsSubject.value;
    const application = applications.find(app => app.id === applicationId);
    if (application) {
      application.payments.push(payment);
      if (payment.status === PaymentStatus.COMPLETED) {
        application.status = ApplicationStatus.PROCESSING;
      }
      this.saveApplications(applications);
    }
  }

  updateApplicationStatus(applicationId: string, status: ApplicationStatus): Observable<boolean> {
    const applications = this.applicationsSubject.value;
    const application = applications.find(app => app.id === applicationId);

    if (application) {
      application.status = status;

      if (status === ApplicationStatus.COMPLETED) {
        application.completionDate = new Date();
        application.timeline.forEach(step => {
          step.status = TimelineStatus.COMPLETED;
          step.isCompleted = true;
        });
      }

      this.saveApplications(applications);
      return of(true).pipe(delay(500));
    }

    return of(false);
  }

  getUserApplications(userId: string): Observable<Application[]> {
    return this.applications$.pipe(
      map(applications => applications.filter(app => app.userId === userId))
    );
  }

  getApplicationById(applicationId: string): Observable<Application | undefined> {
    return this.applications$.pipe(
      map(applications => applications.find(app => app.id === applicationId))
    );
  }

  searchApplicationByTrackingNumber(trackingNumber: string): Observable<Application | undefined> {
    return this.applications$.pipe(
      delay(1000),
      map(applications => applications.find(app => app.trackingNumber === trackingNumber))
    );
  }

  getApplicationStatistics(): Observable<any> {
    return this.applications$.pipe(
      map(applications => {
        const total = applications.length;
        const completed = applications.filter(app => app.status === ApplicationStatus.COMPLETED).length;
        const processing = applications.filter(app => app.status === ApplicationStatus.PROCESSING).length;
        const pending = applications.filter(app => app.status === ApplicationStatus.DRAFT ||
          app.status === ApplicationStatus.SUBMITTED).length;

        const serviceBreakdown = applications.reduce((acc, app) => {
          acc[app.serviceId] = (acc[app.serviceId] || 0) + 1;
          return acc;
        }, {} as any);

        return {
          total,
          completed,
          processing,
          pending,
          completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
          serviceBreakdown
        };
      })
    );
  }

  simulateApplicationProgress(applicationId: string): Observable<ApplicationTimeline[]> {
    return new Observable(observer => {
      const interval = setInterval(() => {
        const applications = this.applicationsSubject.value;
        const application = applications.find(app => app.id === applicationId);

        if (application) {
          const timeline = application.timeline;
          const nextPendingStep = timeline.find(step => step.status === TimelineStatus.PENDING);

          if (nextPendingStep) {
            nextPendingStep.status = TimelineStatus.IN_PROGRESS;

            setTimeout(() => {
              nextPendingStep.status = TimelineStatus.COMPLETED;
              nextPendingStep.isCompleted = true;
              nextPendingStep.date = new Date();

              const allCompleted = timeline.every(step => step.isCompleted);
              if (allCompleted) {
                application.status = ApplicationStatus.COMPLETED;
                application.completionDate = new Date();
                clearInterval(interval);
                observer.complete();
              }

              this.saveApplications(applications);
              observer.next(timeline);
            }, 2000);
          }
        }
      }, 5000);

      setTimeout(() => {
        clearInterval(interval);
        observer.complete();
      }, 120000);
    });
  }
}