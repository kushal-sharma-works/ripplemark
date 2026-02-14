import { ChangeDetectionStrategy, Component, computed, linkedSignal, signal } from '@angular/core';
import { CardModule } from 'primeng/card';

@Component({
  standalone: true,
  selector: 'app-dashboard-page',
  imports: [CardModule],
  template: `
    <h1 class="text-2xl font-semibold mb-4">Dashboard</h1>
    <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      @for (card of cards(); track card.label) {
        <p-card>
          <div class="text-sm text-[var(--text-color-secondary)]">{{ card.label }}</div>
          <div class="text-2xl font-semibold mt-2">{{ card.value }}</div>
        </p-card>
      }
    </div>

    <p-card class="mt-4">
      <ng-template pTemplate="header"><div class="px-4 py-3 font-semibold">System Status</div></ng-template>
      @switch (healthSummary()) {
        @case ('healthy') { <p class="text-green-500">All systems operational</p> }
        @case ('degraded') { <p class="text-yellow-500">Some systems degraded</p> }
        @default { <p class="text-red-500">Critical outage detected</p> }
      }
    </p-card>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  readonly totalServices = signal(42);
  readonly totalDependencies = signal(136);
  readonly recentChanges = signal(8);
  readonly systemHealth = signal<'healthy' | 'degraded' | 'down'>('healthy');

  readonly healthSummary = linkedSignal(() => this.systemHealth());

  readonly cards = computed(() => [
    { label: 'Total Services', value: this.totalServices() },
    { label: 'Total Dependencies', value: this.totalDependencies() },
    { label: 'Recent Changes', value: this.recentChanges() },
    { label: 'System Health', value: this.systemHealth() },
  ]);
}
