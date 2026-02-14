import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TagModule } from 'primeng/tag';

@Component({
  selector: 'app-service-type-badge',
  standalone: true,
  imports: [TagModule],
  template: `<p-tag [value]="type()" [severity]="severity()"></p-tag>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServiceTypeBadgeComponent {
  readonly type = input.required<string>();

  readonly severity = computed(() => {
    switch (this.type()) {
      case 'api':
        return 'info';
      case 'frontend':
        return 'contrast';
      case 'database':
        return 'danger';
      default:
        return 'success';
    }
  });
}
