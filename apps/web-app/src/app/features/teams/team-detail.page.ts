import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';

@Component({
  standalone: true,
  selector: 'app-team-detail-page',
  imports: [TableModule, ButtonModule],
  template: `
    <h1 class="text-2xl font-semibold mb-4">Team: {{ teamId }}</h1>

    <h2 class="font-semibold mb-2">Members</h2>
    <p-table [value]="members()">
      <ng-template pTemplate="header"><tr><th>Name</th><th>Role</th><th></th></tr></ng-template>
      <ng-template pTemplate="body" let-member>
        <tr>
          <td>{{ member.name }}</td>
          <td>{{ member.role }}</td>
          <td>
            @if (isAdmin) {
              <button pButton size="small" label="Manage"></button>
            }
          </td>
        </tr>
      </ng-template>
    </p-table>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamDetailPage {
  private readonly route = inject(ActivatedRoute);
  readonly teamId = this.route.snapshot.paramMap.get('id') ?? 'unknown';
  readonly isAdmin = true;
  readonly members = signal([
    { name: 'Kushal', role: 'admin' },
    { name: 'Alex', role: 'engineer' },
  ]);
}
