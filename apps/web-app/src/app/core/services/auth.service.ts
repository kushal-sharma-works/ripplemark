import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: { id: string; email: string; roles: string[] } | null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly state = signal<AuthState>({
    accessToken: null,
    refreshToken: null,
    user: null,
  });

  private refreshPromise: Promise<string | null> | null = null;

  readonly accessToken = computed(() => this.state().accessToken);
  readonly isAuthenticated = computed(() => !!this.state().accessToken);
  readonly user = computed(() => this.state().user);
  readonly isAdmin = computed(() => this.state().user?.roles.includes('admin') ?? false);

  constructor(private readonly http: HttpClient) {}

  private decodeJwtPayload(token: string): Record<string, unknown> | null {
    try {
      const payloadPart = token.split('.')[1];
      if (!payloadPart) return null;

      const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
      const decoded = atob(padded);
      return JSON.parse(decoded) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  async login(email: string, password: string): Promise<void> {
    const response = await firstValueFrom(
      this.http.post<{ accessToken: string; refreshToken: string }>('/api/auth/login', {
        email,
        password,
      }),
    );

    const payload = this.decodeJwtPayload(response.accessToken);
    const userId = typeof payload?.['sub'] === 'string' ? payload['sub'] : '';
    const userEmail = typeof payload?.['email'] === 'string' ? payload['email'] : email;
    const userRoles = Array.isArray(payload?.['roles'])
      ? payload['roles'].filter((role): role is string => typeof role === 'string')
      : [];

    this.state.set({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      user: {
        id: userId,
        email: userEmail,
        roles: userRoles,
      },
    });
  }

  completeOAuthLogin(accessToken: string, refreshToken: string): boolean {
    const payload = this.decodeJwtPayload(accessToken);
    const userId = typeof payload?.['sub'] === 'string' ? payload['sub'] : '';
    const userEmail = typeof payload?.['email'] === 'string' ? payload['email'] : '';
    const userRoles = Array.isArray(payload?.['roles'])
      ? payload['roles'].filter((role): role is string => typeof role === 'string')
      : [];

    if (!userId || !userEmail) {
      return false;
    }

    this.state.set({
      accessToken,
      refreshToken,
      user: {
        id: userId,
        email: userEmail,
        roles: userRoles,
      },
    });

    return true;
  }

  setSession(payload: AuthState): void {
    this.state.set(payload);
  }

  logout(): void {
    this.state.set({ accessToken: null, refreshToken: null, user: null });
  }

  async refreshToken(): Promise<string | null> {
    if (!this.state().refreshToken) return null;
    if (this.refreshPromise) return this.refreshPromise;

    this.refreshPromise = firstValueFrom(
      this.http.post<{ accessToken: string; refreshToken: string }>('/api/auth/refresh', {
        refreshToken: this.state().refreshToken,
      }),
    )
      .then((response) => {
        this.state.update((state) => ({ ...state, accessToken: response.accessToken, refreshToken: response.refreshToken }));
        return response.accessToken;
      })
      .catch(() => {
        this.logout();
        return null;
      })
      .finally(() => {
        this.refreshPromise = null;
      });

    return this.refreshPromise;
  }
}
