import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [RouterOutlet, CardModule],
  template: `
    <div class="min-h-screen grid place-items-center bg-[var(--surface-ground)] p-4">
      <p-card header="Ripplemark Access" class="w-full max-w-md shadow-md">
        <router-outlet />
      </p-card>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthLayoutComponent {}
