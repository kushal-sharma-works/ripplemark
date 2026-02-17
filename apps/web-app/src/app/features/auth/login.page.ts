import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '../../core/services/auth.service';

@Component({
  standalone: true,
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, InputTextModule, PasswordModule, ButtonModule],
  template: `
    <form class="space-y-4" [formGroup]="form" (ngSubmit)="submit()">
      <div>
        <label class="block text-sm mb-1">Email</label>
        <input pInputText class="w-full" formControlName="email" />
      </div>
      <div>
        <label class="block text-sm mb-1">Password</label>
        <p-password styleClass="w-full" [feedback]="false" formControlName="password" />
      </div>
      <button pButton type="submit" class="w-full" label="Sign In" [disabled]="form.invalid"></button>
      <button
        pButton
        type="button"
        class="w-full p-button-outlined"
        label="Continue with Google"
        (click)="signInWithGoogle()"
      ></button>

      @if (errorMessage()) {
        <p class="text-sm text-red-500">{{ errorMessage() }}</p>
      }
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  async submit(): Promise<void> {
    this.errorMessage.set(null);
    if (!this.form.valid) return;

    try {
      await this.auth.login(this.form.getRawValue().email, this.form.getRawValue().password);
      await this.router.navigateByUrl('/dashboard');
    } catch {
      this.errorMessage.set('Login failed. Check your credentials and try again.');
    }
  }

  signInWithGoogle(): void {
    window.location.href = '/api/auth/oauth/google';
  }
}
