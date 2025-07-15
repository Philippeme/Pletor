import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

@Injectable()
export class HttpErrorInterceptor implements HttpInterceptor {
    private activeRequests = 0;
    private loadingElement?: HTMLElement;

    constructor(
        private authService: AuthService,
        private router: Router
    ) { }

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        this.showLoading();

        // Add auth token if available
        const currentUser = this.authService.getCurrentUser();
        if (currentUser && currentUser.isAuthenticated) {
            req = req.clone({
                setHeaders: {
                    'Authorization': `Bearer ${currentUser.id}`,
                    'Content-Type': 'application/json'
                }
            });
        }

        return next.handle(req).pipe(
            catchError((error: HttpErrorResponse) => {
                let errorMessage = 'An error occurred';

                if (error.error instanceof ErrorEvent) {
                    // Client-side error
                    errorMessage = `Error: ${error.error.message}`;
                } else {
                    // Server-side error
                    switch (error.status) {
                        case 401:
                            errorMessage = 'Unauthorized access';
                            this.authService.logout();
                            this.router.navigate(['/home']);
                            break;
                        case 403:
                            errorMessage = 'Access forbidden';
                            break;
                        case 404:
                            errorMessage = 'Resource not found';
                            break;
                        case 500:
                            errorMessage = 'Internal server error';
                            break;
                        default:
                            errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
                    }
                }

                console.error('HTTP Error:', errorMessage);
                return throwError(() => new Error(errorMessage));
            }),
            finalize(() => {
                this.hideLoading();
            })
        );
    }

    private showLoading(): void {
        this.activeRequests++;
        if (this.activeRequests === 1) {
            this.loadingElement = document.createElement('div');
            this.loadingElement.className = 'loading-overlay';
            this.loadingElement.innerHTML = `
        <div class="loading-spinner">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
        </div>
      `;
            document.body.appendChild(this.loadingElement);
        }
    }

    private hideLoading(): void {
        this.activeRequests--;
        if (this.activeRequests === 0 && this.loadingElement) {
            document.body.removeChild(this.loadingElement);
            this.loadingElement = undefined;
        }
    }
}