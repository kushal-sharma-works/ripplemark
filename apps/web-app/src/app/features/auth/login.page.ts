import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
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
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  submit(): void {
    this.auth.setSession({
      accessToken: 'demo-token',
      refreshToken: 'demo-refresh',
      user: { id: 'u1', email: this.form.value.email!, roles: ['admin'] },
    });
    void this.router.navigateByUrl('/dashboard');
  }
}
