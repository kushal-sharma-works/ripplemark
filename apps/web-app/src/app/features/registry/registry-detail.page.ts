import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TimelineModule } from 'primeng/timeline';
import { CardModule } from 'primeng/card';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { ServiceTypeBadgeComponent } from '../../shared/components/service-type-badge.component';

@Component({
  standalone: true,
  selector: 'app-registry-detail-page',
  imports: [TimelineModule, CardModule, ServiceTypeBadgeComponent],
  template: `
    <h1 class="text-2xl font-semibold mb-4">Service Detail: {{ id }}</h1>
    <div class="grid md:grid-cols-2 gap-4">
      <p-card header="Metadata">
        <p>Name: {{ serviceName() }}</p>
        <p>Version: {{ currentVersion() }}</p>
        <p>Status: {{ status() }}</p>
        <app-service-type-badge [type]="serviceType()" />
      </p-card>
      <p-card header="Endpoints">
        @if (endpoints().length > 0) {
          <ul class="list-disc pl-5">
            @for (endpoint of endpoints(); track endpoint) {
              <li>{{ endpoint }}</li>
            }
          </ul>
        } @else {
          <p>No endpoints available.</p>
        }
      </p-card>
      <p-card header="Version Timeline" class="md:col-span-2">
        <p-timeline [value]="versions()">
          <ng-template pTemplate="content" let-version>
            {{ version.date }} — {{ version.version }}
          </ng-template>
        </p-timeline>
      </p-card>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegistryDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);

  readonly versions = signal<Array<{ date: string; version: string }>>([]);
  readonly endpoints = signal<string[]>([]);
  readonly serviceName = signal('unknown');
  readonly serviceType = signal('api');
  readonly status = signal('unknown');
  readonly currentVersion = signal('n/a');

  readonly id = this.route.snapshot.paramMap.get('id') ?? 'unknown';

  constructor() {
    void this.loadService();
  }

  private async loadService(): Promise<void> {
    try {
      const service = await firstValueFrom(
        this.api.get<{
          name: string;
          service_type: string;
          status: string;
          versions: Array<{
            version: string;
            created_at: string;
            is_current: boolean;
            service_endpoints: Array<{ method: string; path: string }>;
          }>;
        }>(`/api/registry/services/${this.id}/`),
      );

      this.serviceName.set(service.name);
      this.serviceType.set(service.service_type);
      this.status.set(service.status);

      const versions = (service.versions ?? [])
        .map((version) => ({
          date: new Date(version.created_at).toISOString().slice(0, 10),
          version: version.version,
          isCurrent: version.is_current,
          endpoints: version.service_endpoints ?? [],
        }))
        .sort((a, b) => (a.date < b.date ? 1 : -1));

      this.versions.set(versions.map((version) => ({ date: version.date, version: version.version })));

      const selectedVersion = versions.find((version) => version.isCurrent) ?? versions[0];
      this.currentVersion.set(selectedVersion?.version ?? 'n/a');
      this.endpoints.set(
        (selectedVersion?.endpoints ?? []).map((endpoint) => `${endpoint.method.toUpperCase()} ${endpoint.path}`),
      );
    } catch {
      this.versions.set([]);
      this.endpoints.set([]);
    }
  }
}
