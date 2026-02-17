import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  standalone: true,
  selector: 'app-google-callback-page',
  template: `
    <div class="space-y-3">
      <h2 class="text-lg font-semibold">Signing you in…</h2>
      @if (errorMessage()) {
        <p class="text-sm text-red-500">{{ errorMessage() }}</p>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoogleCallbackPage {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly errorMessage = signal<string | null>(null);

  constructor() {
    const params = this.route.snapshot.queryParamMap;
    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');

    if (!accessToken || !refreshToken) {
      this.errorMessage.set('Google sign-in failed. Missing authentication tokens.');
      void this.router.navigateByUrl('/login');
      return;
    }

    const success = this.auth.completeOAuthLogin(accessToken, refreshToken);
    if (!success) {
      this.errorMessage.set('Google sign-in failed. Invalid authentication response.');
      void this.router.navigateByUrl('/login');
      return;
    }

    void this.router.navigateByUrl('/dashboard');
  }
}
