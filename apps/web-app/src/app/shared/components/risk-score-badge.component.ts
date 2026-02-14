import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TagModule } from 'primeng/tag';

@Component({
  selector: 'app-risk-score-badge',
  standalone: true,
  imports: [TagModule],
  template: `<p-tag [value]="label()" [severity]="severity()"></p-tag>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RiskScoreBadgeComponent {
  readonly score = input.required<number>();

  readonly severity = computed(() => {
    const value = this.score();
    if (value >= 75) return 'danger';
    if (value >= 40) return 'warn';
    return 'success';
  });

  readonly label = computed(() => `Risk ${this.score()}`);
}
