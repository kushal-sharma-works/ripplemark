import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
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
  readonly search = signal('');
  readonly rows = signal([
    { id: 'auth-gateway', name: 'auth-gateway', type: 'api', team: 'platform', status: 'healthy' },
    { id: 'registry-service', name: 'registry-service', type: 'database', team: 'platform', status: 'healthy' },
    { id: 'web-app', name: 'web-app', type: 'frontend', team: 'ui', status: 'healthy' },
  ]);

  filtered() {
    const q = this.search().toLowerCase().trim();
    return this.rows().filter((row) => row.name.includes(q));
  }
}
