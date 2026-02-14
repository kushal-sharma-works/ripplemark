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
