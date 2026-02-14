import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), AuthService],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('refreshes token with request queue behavior', async () => {
    service.setSession({
      accessToken: 'old',
      refreshToken: 'r1',
      user: { id: 'u1', email: 'x@y.com', roles: ['admin'] },
    });

    const p1 = service.refreshToken();
    const p2 = service.refreshToken();

    const req = httpMock.expectOne('/api/auth/refresh');
    req.flush({ accessToken: 'new-access', refreshToken: 'new-refresh' });

    await expect(p1).resolves.toBe('new-access');
    await expect(p2).resolves.toBe('new-access');
  });

  it('returns null when refresh token is missing', async () => {
    service.setSession({ accessToken: 'a', refreshToken: null, user: null });
    await expect(service.refreshToken()).resolves.toBeNull();
  });

  it('computes admin flag from roles', () => {
    service.setSession({
      accessToken: 'a',
      refreshToken: 'r',
      user: { id: 'u1', email: 'x@y.com', roles: ['admin'] },
    });
    expect(service.isAdmin()).toBe(true);

    service.setSession({
      accessToken: 'a',
      refreshToken: 'r',
      user: { id: 'u1', email: 'x@y.com', roles: ['viewer'] },
    });
    expect(service.isAdmin()).toBe(false);
  });

  it('clears session on logout', () => {
    service.setSession({
      accessToken: 'a',
      refreshToken: 'r',
      user: { id: 'u1', email: 'x@y.com', roles: ['admin'] },
    });

    service.logout();
    expect(service.isAuthenticated()).toBe(false);
    expect(service.user()).toBeNull();
  });

  it('logs out when refresh fails', async () => {
    service.setSession({
      accessToken: 'old',
      refreshToken: 'r1',
      user: { id: 'u1', email: 'x@y.com', roles: ['admin'] },
    });

    const promise = service.refreshToken();
    const req = httpMock.expectOne('/api/auth/refresh');
    req.flush({ message: 'bad token' }, { status: 401, statusText: 'Unauthorized' });

    await expect(promise).resolves.toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });
});
