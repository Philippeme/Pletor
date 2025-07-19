import { Injectable } from '@angular/core';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { 
  Claim, 
  ClaimStatus, 
  ClaimType, 
  ClaimPriority, 
  ClaimCategory 
} from '../models/claim.model';

@Injectable({
  providedIn: 'root'
})
export class ClaimService {
  private claimsSubject = new BehaviorSubject<Claim[]>([]);
  public claims$ = this.claimsSubject.asObservable();

  constructor() {
    this.loadClaims();
  }

  private loadClaims(): void {
    const savedClaims = localStorage.getItem('mk-gov-claims');
    if (savedClaims) {
      const claims = JSON.parse(savedClaims);
      this.claimsSubject.next(claims);
    }
  }

  private saveClaims(claims: Claim[]): void {
    localStorage.setItem('mk-gov-claims', JSON.stringify(claims));
    this.claimsSubject.next(claims);
  }

  submitClaim(claimData: any): Observable<Claim> {
    const newClaim: Claim = {
      id: 'claim-' + Date.now(),
      userId: claimData.userId,
      trackingNumber: this.generateTrackingNumber(),
      claimType: claimData.claimType,
      subject: claimData.subject,
      description: claimData.description,
      priority: claimData.priority,
      category: claimData.claimCategory,
      status: ClaimStatus.SUBMITTED,
      submissionDate: new Date(),
      attachments: [],
      messages: [
        {
          id: 'msg-' + Date.now(),
          senderId: claimData.userId,
          senderType: 'citizen',
          message: `Initial claim: ${claimData.subject}`,
          timestamp: new Date(),
          isRead: false
        }
      ]
    };

    const currentClaims = this.claimsSubject.value;
    const updatedClaims = [...currentClaims, newClaim];
    this.saveClaims(updatedClaims);

    return of(newClaim).pipe(delay(1000));
  }

  private generateTrackingNumber(): string {
    const prefix = 'CLM';
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  }

  getClaimByTrackingNumber(trackingNumber: string): Observable<Claim | undefined> {
    return this.claims$.pipe(
      delay(500),
      map(claims => claims.find(claim => claim.trackingNumber === trackingNumber))
    );
  }

  getUserClaims(userId: string): Observable<Claim[]> {
    return this.claims$.pipe(
      map(claims => claims.filter(claim => claim.userId === userId))
    );
  }

  updateClaimStatus(claimId: string, status: ClaimStatus): Observable<boolean> {
    const claims = this.claimsSubject.value;
    const claim = claims.find(c => c.id === claimId);
    
    if (claim) {
      claim.status = status;
      if (status === ClaimStatus.RESOLVED || status === ClaimStatus.CLOSED) {
        claim.resolutionDate = new Date();
      }
      this.saveClaims(claims);
      return of(true).pipe(delay(500));
    }
    
    return of(false);
  }
}