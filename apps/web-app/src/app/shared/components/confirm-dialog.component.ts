import { ChangeDetectionStrategy, Component, model, output, input } from '@angular/core';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [ConfirmDialogModule, ButtonModule],
  template: `
    @if (visible()) {
      <div class="fixed inset-0 bg-black/40 grid place-items-center z-50">
        <div class="bg-[var(--surface-card)] rounded-xl p-5 w-full max-w-sm space-y-4">
          <h3 class="font-semibold text-lg">{{ title() }}</h3>
          <p>{{ message() }}</p>
          <div class="flex justify-end gap-2">
            <button pButton label="Cancel" severity="secondary" (click)="close(false)"></button>
            <button pButton label="Confirm" severity="danger" (click)="close(true)"></button>
          </div>
        </div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialogComponent {
  readonly title = input('Confirm Action');
  readonly message = input('Please confirm this action');
  readonly visible = model(false);
  readonly decision = output<boolean>();

  close(value: boolean): void {
    this.visible.set(false);
    this.decision.emit(value);
  }
}
