import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

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
            @if (isAdmin()) {
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
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  readonly teamId = this.route.snapshot.paramMap.get('id') ?? 'unknown';
  readonly isAdmin = computed(() => this.auth.isAdmin());
  readonly members = signal<Array<{ name: string; role: string }>>([]);

  constructor() {
    void this.loadMembers();
  }

  private async loadMembers(): Promise<void> {
    try {
      const memberships = await firstValueFrom(
        this.api.get<Array<{ team: string; role: string; user: string }>>('/api/registry/team-memberships/'),
      );

      this.members.set(
        (memberships ?? [])
          .filter((membership) => membership.team === this.teamId)
          .map((membership) => ({
            name: membership.user,
            role: membership.role,
          })),
      );
    } catch {
      this.members.set([]);
    }
  }
}
