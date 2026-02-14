import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  template: `
    <div class="text-center py-10 border border-dashed rounded-xl border-[var(--surface-border)]">
      <i class="pi pi-inbox text-2xl"></i>
      <p class="mt-2 text-sm">{{ message() }}</p>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyStateComponent {
  readonly message = input('No data available');
}
