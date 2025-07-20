import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly API_URL = 'http://localhost:8000/api';
  //private readonly API_URL = 'https://apimkgov.mkba.net/api';

  constructor(private http: HttpClient) {}

  // Headers optionnels avec token
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  // GET
  get<T>(endpoint: string): Observable<T> {
    return this.http.get<T>(`${this.API_URL}${endpoint}`, {
      headers: this.getHeaders()
    });
  }

  // POST
  post<T>(endpoint: string, body: any): Observable<T> {
    return this.http.post<T>(`${this.API_URL}${endpoint}`, body, {
      headers: this.getHeaders()
    });
  }
  patch<T>(endpoint: string, body: any): Observable<T> {
    return this.http.patch<T>(`${this.API_URL}${endpoint}`, body, {
      headers: this.getHeaders()
    });
  }

  // PUT / DELETE... peuvent être ajoutés pareil
}
