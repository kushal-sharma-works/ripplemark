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

  it('extracts collection from direct array', () => {
    expect(service.extractCollection([{ id: 1 }])).toEqual([{ id: 1 }]);
  });

  it('extracts collection from results field', () => {
    expect(service.extractCollection({ results: [{ id: 1 }] })).toEqual([{ id: 1 }]);
  });

  it('extracts collection from data field', () => {
    expect(service.extractCollection({ data: [{ id: 2 }] })).toEqual([{ id: 2 }]);
  });

  it('returns empty collection when payload is nullish', () => {
    expect(service.extractCollection(null)).toEqual([]);
    expect(service.extractCollection(undefined)).toEqual([]);
  });

  it('calls post', () => {
    service.post('/api/services', { name: 'svc-a' }).subscribe();
    const req = httpMock.expectOne('/api/services');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'svc-a' });
    req.flush({ id: 'svc-a' });
  });

  it('calls put', () => {
    service.put('/api/services/svc-a', { status: 'healthy' }).subscribe();
    const req = httpMock.expectOne('/api/services/svc-a');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ status: 'healthy' });
    req.flush({ ok: true });
  });

  it('calls patch', () => {
    service.patch('/api/services/svc-a', { status: 'degraded' }).subscribe();
    const req = httpMock.expectOne('/api/services/svc-a');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ status: 'degraded' });
    req.flush({ ok: true });
  });

  it('calls delete', () => {
    service.delete('/api/services/svc-a').subscribe();
    const req = httpMock.expectOne('/api/services/svc-a');
    expect(req.request.method).toBe('DELETE');
    req.flush({ ok: true });
  });
});
