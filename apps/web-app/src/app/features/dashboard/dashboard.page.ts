import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CardModule } from 'primeng/card';
import { ApiService, PaginatedResponse } from '../../core/services/api.service';

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
  private readonly api = inject(ApiService);

  readonly totalServices = signal(0);
  readonly totalDependencies = signal(0);
  readonly recentChanges = signal(0);
  readonly systemHealth = signal<'healthy' | 'degraded' | 'down'>('degraded');

  readonly healthSummary = computed(() => this.systemHealth());

  readonly cards = computed(() => [
    { label: 'Total Services', value: this.totalServices() },
    { label: 'Total Dependencies', value: this.totalDependencies() },
    { label: 'Recent Changes', value: this.recentChanges() },
    { label: 'System Health', value: this.systemHealth() },
  ]);

  constructor() {
    void this.loadOverview();
  }

  private async loadOverview(): Promise<void> {
    try {
      const stats = await firstValueFrom(
        this.api.get<{ success: boolean; data: { nodeCount: number; edgeCount: number } }>(
          '/api/topology/query/statistics',
        ),
      );

      this.totalServices.set(Number(stats.data?.nodeCount ?? 0));
      this.totalDependencies.set(Number(stats.data?.edgeCount ?? 0));
    } catch {
      this.systemHealth.set('down');
      return;
    }

    try {
      const snapshots = await firstValueFrom(
        this.api.get<PaginatedResponse<Record<string, unknown>> | Array<Record<string, unknown>>>('/api/registry/snapshots/'),
      );
      this.recentChanges.set(this.api.extractCollection(snapshots).length);
      this.systemHealth.set('healthy');
    } catch {
      this.recentChanges.set(0);
      this.systemHealth.set('degraded');
    }
  }
}
