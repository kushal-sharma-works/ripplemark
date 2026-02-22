import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PaginatedResponse<T> {
  results?: T[];
  data?: T[];
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private readonly http: HttpClient) {}

  extractCollection<T>(payload: T[] | PaginatedResponse<T> | null | undefined): T[] {
    if (Array.isArray(payload)) {
      return payload;
    }

    if (payload && Array.isArray(payload.results)) {
      return payload.results;
    }

    if (payload && Array.isArray(payload.data)) {
      return payload.data;
    }

    return [];
  }

  get<T>(url: string, params?: Record<string, string | number | boolean>): Observable<T> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        httpParams = httpParams.set(key, String(value));
      });
    }
    return this.http.get<T>(url, { params: httpParams });
  }

  post<T, B>(url: string, body: B): Observable<T> {
    return this.http.post<T>(url, body);
  }

  put<T, B>(url: string, body: B): Observable<T> {
    return this.http.put<T>(url, body);
  }

  patch<T, B>(url: string, body: B): Observable<T> {
    return this.http.patch<T>(url, body);
  }

  delete<T>(url: string): Observable<T> {
    return this.http.delete<T>(url);
  }
}
