import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { firstValueFrom } from 'rxjs';
import { ApiService, PaginatedResponse } from '../../core/services/api.service';
import { ServiceTypeBadgeComponent } from '../../shared/components/service-type-badge.component';
import { PaginationComponent } from '../../shared/components/pagination.component';

@Component({
  standalone: true,
  selector: 'app-registry-page',
  imports: [FormsModule, TableModule, InputTextModule, RouterLink, ServiceTypeBadgeComponent, PaginationComponent],
  template: `
    <h1 class="text-2xl font-semibold mb-4">Service Registry</h1>
    <input
      pInputText
      placeholder="Search service"
      class="w-full md:w-96 mb-4"
      [ngModel]="search()"
      (ngModelChange)="search.set($event)"
    />

    <p-table [value]="filtered()" [paginator]="false" [rows]="10">
      <ng-template pTemplate="header">
        <tr><th>Name</th><th>Type</th><th>Team</th><th>Status</th></tr>
      </ng-template>
      <ng-template pTemplate="body" let-row>
        <tr [routerLink]="['/registry', row.id]" class="cursor-pointer">
          <td>{{ row.name }}</td>
          <td><app-service-type-badge [type]="row.type" /></td>
          <td>{{ row.team }}</td>
          <td>{{ row.status }}</td>
        </tr>
      </ng-template>
    </p-table>
    <app-pagination [total]="filtered().length" />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegistryPage {
  private readonly api = inject(ApiService);

  readonly search = signal('');
  readonly rows = signal<Array<{ id: string; name: string; type: string; team: string; status: string }>>([]);

  constructor() {
    void this.loadRegistry();
  }

  private async loadRegistry(): Promise<void> {
    try {
      const [services, ownerships, teams] = await Promise.all([
        firstValueFrom(
          this.api.get<PaginatedResponse<{ id: string; name: string; service_type: string; status: string }> | Array<{ id: string; name: string; service_type: string; status: string }>>('/api/registry/services/'),
        ),
        firstValueFrom(
          this.api.get<PaginatedResponse<{ service: string; team: string; ownership_type: string }> | Array<{ service: string; team: string; ownership_type: string }>>('/api/registry/ownerships/'),
        ),
        firstValueFrom(
          this.api.get<PaginatedResponse<{ id: string; name: string }> | Array<{ id: string; name: string }>>('/api/registry/teams/'),
        ),
      ]);

      const serviceRows = this.api.extractCollection(services);
      const ownershipRows = this.api.extractCollection(ownerships);
      const teamRows = this.api.extractCollection(teams);

      const teamNameById = new Map(teamRows.map((team) => [team.id, team.name]));
      const teamByService = new Map<string, string>();
      for (const ownership of ownershipRows) {
        if (ownership.ownership_type === 'primary' && ownership.service && ownership.team) {
          teamByService.set(ownership.service, teamNameById.get(ownership.team) ?? 'unknown');
        }
      }

      this.rows.set(
        serviceRows.map((service) => ({
          id: service.id,
          name: service.name,
          type: service.service_type,
          team: teamByService.get(service.id) ?? 'unassigned',
          status: service.status,
        })),
      );
    } catch {
      this.rows.set([]);
    }
  }

  filtered() {
    const q = this.search().toLowerCase().trim();
    return this.rows().filter((row) => row.name.includes(q));
  }
}
