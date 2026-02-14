import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApiService } from './api.service';

describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [ApiService, provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('adds query params on get', () => {
    service.get('/api/services', { page: 2 }).subscribe();
    const req = httpMock.expectOne('/api/services?page=2');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('calls get without params', () => {
    service.get('/api/health').subscribe();
    const req = httpMock.expectOne('/api/health');
    expect(req.request.method).toBe('GET');
    req.flush({ ok: true });
  });
});
