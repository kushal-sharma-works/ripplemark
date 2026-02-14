import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [ProgressSpinnerModule],
  template: '<div class="grid place-items-center py-8"><p-progressSpinner ariaLabel="loading"></p-progressSpinner></div>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingSpinnerComponent {}
