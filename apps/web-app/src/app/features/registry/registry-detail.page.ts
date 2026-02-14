import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TimelineModule } from 'primeng/timeline';
import { CardModule } from 'primeng/card';
import { ServiceTypeBadgeComponent } from '../../shared/components/service-type-badge.component';

@Component({
  standalone: true,
  selector: 'app-registry-detail-page',
  imports: [TimelineModule, CardModule, ServiceTypeBadgeComponent],
  template: `
    <h1 class="text-2xl font-semibold mb-4">Service Detail: {{ id }}</h1>
    <div class="grid md:grid-cols-2 gap-4">
      <p-card header="Metadata">
        <p>Name: {{ id }}</p>
        <p>Version: 1.4.3</p>
        <p>Owner Team: platform</p>
        <app-service-type-badge type="api" />
      </p-card>
      <p-card header="Endpoints">
        <ul class="list-disc pl-5">
          <li>GET /health</li>
          <li>POST /auth/login</li>
          <li>POST /auth/refresh</li>
        </ul>
      </p-card>
      <p-card header="Version Timeline" class="md:col-span-2">
        <p-timeline [value]="versions">
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
  readonly versions = [
    { date: '2026-02-11', version: '1.4.3' },
    { date: '2026-02-01', version: '1.4.2' },
    { date: '2026-01-18', version: '1.4.1' },
  ];

  readonly id = this.route.snapshot.paramMap.get('id') ?? 'unknown';
}
