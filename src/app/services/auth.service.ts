import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { User, LoginData, RegistrationData } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor() {
    this.initializeUser();
  }

  private initializeUser(): void {
    const savedUser = localStorage.getItem('mk-gov-user');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      user.isAuthenticated = true;
      this.currentUserSubject.next(user);
    }
  }

  login(loginData: LoginData): Observable<{ success: boolean; message: string; user?: User }> {
    // Simulate API call
    return of(null).pipe(
      delay(1000),
      map(() => {
        // Mock authentication logic
        const mockUser: User = {
          id: 'user-123',
          phoneNumber: loginData.identifier,
          email: loginData.identifier.includes('@') ? loginData.identifier : 'user@example.com',
          firstName: 'John',
          lastName: 'Doe',
          isDiaspora: false,
          isAuthenticated: true,
          registrationDate: new Date(),
          lastLoginDate: new Date()
        };

        this.currentUserSubject.next(mockUser);
        localStorage.setItem('mk-gov-user', JSON.stringify(mockUser));

        return {
          success: true,
          message: 'Login successful',
          user: mockUser
        };
      })
    );
  }

  register(registrationData: RegistrationData): Observable<{ success: boolean; message: string; user?: User }> {
    // Simulate API call
    return of(null).pipe(
      delay(1500),
      map(() => {
        const newUser: User = {
          id: 'user-' + Date.now(),
          cniNumber: registrationData.cniNumber,
          consularCardNumber: registrationData.consularCardNumber,
          phoneNumber: registrationData.phoneNumber,
          email: registrationData.email,
          isDiaspora: registrationData.accountType === 'diaspora',
          isAuthenticated: true,
          registrationDate: new Date(),
          lastLoginDate: new Date()
        };

        this.currentUserSubject.next(newUser);
        localStorage.setItem('mk-gov-user', JSON.stringify(newUser));

        return {
          success: true,
          message: 'Registration successful',
          user: newUser
        };
      })
    );
  }

  logout(): void {
    this.currentUserSubject.next(null);
    localStorage.removeItem('mk-gov-user');
  }

  isAuthenticated(): boolean {
    return this.currentUserSubject.value?.isAuthenticated || false;
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  sendPasswordResetCode(identifier: string): Observable<{ success: boolean; message: string }> {
    return of(null).pipe(
      delay(1000),
      map(() => ({
        success: true,
        message: 'Password reset code sent successfully'
      }))
    );
  }
}