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
      documents: [],
      timeline: this.createInitialTimeline(serviceId),
      payments: [],
      trackingNumber: this.generateTrackingNumber()
    };

    const currentApplications = this.applicationsSubject.value;
    const updatedApplications = [...currentApplications, newApplication];
    this.saveApplications(updatedApplications);

    return of(newApplication).pipe(delay(500));
  }

  private createInitialTimeline(serviceId: number): ApplicationTimeline[] {
    if (serviceId === 1) { // passport service
      return [
        {
          id: 'step-1',
          step: 'Pre-enrollment',
          status: TimelineStatus.PENDING,
          date: new Date(),
          description: 'Complete online pre-enrollment form on PASSCAM platform',
          isCompleted: false,
          estimatedDuration: '10-15 minutes'
        },
        {
          id: 'step-2',
          step: 'Payment',
          status: TimelineStatus.PENDING,
          date: new Date(),
          description: 'Pay passport fees (110,000 XAF) via MTN Money or Orange Money',
          isCompleted: false,
          estimatedDuration: '5 minutes'
        },
        {
          id: 'step-3',
          step: 'Appointment Booking',
          status: TimelineStatus.PENDING,
          date: new Date(),
          description: 'Schedule biometric enrollment appointment at DGSN center',
          isCompleted: false,
          estimatedDuration: '5 minutes'
        },
        {
          id: 'step-4',
          step: 'Document Verification',
          status: TimelineStatus.PENDING,
          date: new Date(),
          description: 'Submit required documents for verification',
          isCompleted: false,
          estimatedDuration: '15-20 minutes'
        },
        {
          id: 'step-5',
          step: 'Biometric Enrollment',
          status: TimelineStatus.PENDING,
          date: new Date(),
          description: 'Biometric data capture (fingerprints and photo) at DGSN center',
          isCompleted: false,
          estimatedDuration: '30 minutes'
        },
        {
          id: 'step-6',
          step: 'Production',
          status: TimelineStatus.PENDING,
          date: new Date(),
          description: 'Passport production with advanced security features',
          isCompleted: false,
          estimatedDuration: '48 hours'
        },
        {
          id: 'step-7',
          step: 'Ready for Collection',
          status: TimelineStatus.PENDING,
          date: new Date(),
          description: 'Passport ready for collection at designated center',
          isCompleted: false,
          estimatedDuration: 'Immediate'
        }
      ];
    } else if (serviceId === 4) { // birth-certificate-copy service
      return [
        {
          id: 'step-1',
          step: 'Form Submission',
          status: TimelineStatus.PENDING,
          date: new Date(),
          description: 'Submit request form with required information',
          isCompleted: false,
          estimatedDuration: '5-10 minutes'
        },
        {
          id: 'step-2',
          step: 'Payment',
          status: TimelineStatus.PENDING,
          date: new Date(),
          description: 'Pay certification fees (300 XAF total)',
          isCompleted: false,
          estimatedDuration: '2 minutes'
        },
        {
          id: 'step-3',
          step: 'Record Verification',
          status: TimelineStatus.PENDING,
          date: new Date(),
          description: 'Verification of birth record in civil registry',
          isCompleted: false,
          estimatedDuration: '30 minutes - 2 hours'
        },
        {
          id: 'step-4',
          step: 'Document Preparation',
          status: TimelineStatus.PENDING,
          date: new Date(),
          description: 'Preparation of certified copy with official seal',
          isCompleted: false,
          estimatedDuration: '15-30 minutes'
        },
        {
          id: 'step-5',
          step: 'Ready for Collection',
          status: TimelineStatus.PENDING,
          date: new Date(),
          description: 'Certified copy ready for collection',
          isCompleted: false,
          estimatedDuration: 'Immediate'
        }
      ];
    }
    return [];
  }

  private generateTrackingNumber(): string {
    const prefix = 'MKG';
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `${prefix}${timestamp}${random}`;
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
        // Simulate successful payment with 95% success rate
        const isSuccessful = Math.random() > 0.05;
        payment.status = isSuccessful ? PaymentStatus.COMPLETED : PaymentStatus.FAILED;

        if (isSuccessful) {
          this.updateApplicationPayment(applicationId, payment);
          this.updateApplicationTimeline(applicationId, 'payment');
        }

        return payment;
      })
    );
  }

  private getPaymentDescription(applicationId: string): string {
    const application = this.applicationsSubject.value.find(app => app.id === applicationId);
    if (!application) return 'Service application fee';

    switch (application.serviceId) {
      case 1: // passport
        return 'Biometric passport application fee';
      case 4: // birth-certificate-copy
        return 'Birth certificate copy certification fee';
      default:
        return 'Government service application fee';
    }
  }

  private getPaymentProcessingDelay(method: PaymentMethod): number {
    switch (method) {
      case PaymentMethod.MTN_MONEY:
      case PaymentMethod.ORANGE_MONEY:
        return 2000; // 2 seconds for mobile money
      case PaymentMethod.CREDIT_CARD:
        return 3000; // 3 seconds for credit card
      case PaymentMethod.BANK_TRANSFER:
        return 5000; // 5 seconds for bank transfer
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

  private updateApplicationTimeline(applicationId: string, completedStep: string): void {
    const applications = this.applicationsSubject.value;
    const application = applications.find(app => app.id === applicationId);
    if (application) {
      const timeline = application.timeline;
      let stepFound = false;

      for (let i = 0; i < timeline.length; i++) {
        const step = timeline[i];
        if (step.step.toLowerCase().includes(completedStep.toLowerCase()) ||
          (completedStep === 'payment' && step.id === 'step-2')) {
          step.status = TimelineStatus.COMPLETED;
          step.isCompleted = true;
          step.date = new Date();
          stepFound = true;

          // Mark next step as in progress
          if (i + 1 < timeline.length) {
            timeline[i + 1].status = TimelineStatus.IN_PROGRESS;
          }
          break;
        }
      }

      if (stepFound) {
        this.saveApplications(applications);
      }
    }
  }

  updateApplicationStatus(applicationId: string, status: ApplicationStatus): Observable<boolean> {
    const applications = this.applicationsSubject.value;
    const application = applications.find(app => app.id === applicationId);

    if (application) {
      application.status = status;

      // Update completion date if completed
      if (status === ApplicationStatus.COMPLETED) {
        application.completionDate = new Date();
        // Mark all timeline steps as completed
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
      delay(1000), // Simulate API call
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

              // Check if all steps are completed
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
      }, 5000); // Progress every 5 seconds

      // Stop simulation after 2 minutes
      setTimeout(() => {
        clearInterval(interval);
        observer.complete();
      }, 120000);
    });
  }
}