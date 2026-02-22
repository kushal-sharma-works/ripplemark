import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { firstValueFrom } from 'rxjs';
import { ApiService, PaginatedResponse } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

type MembershipRow = {
  id: string;
  team: string;
  role: string;
  user: string | { username?: string; email?: string };
};

type MemberView = {
  id: string;
  name: string;
  role: string;
};

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
              <button pButton size="small" label="Manage" (click)="manageMember(member)"></button>
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
  readonly members = signal<MemberView[]>([]);

  private readonly allowedRoles = new Set(['admin', 'team_lead', 'engineer', 'viewer']);

  constructor() {
    void this.loadMembers();
  }

  private async loadMembers(): Promise<void> {
    try {
      const memberships = await firstValueFrom(
        this.api.get<PaginatedResponse<MembershipRow> | MembershipRow[]>('/api/registry/team-memberships/'),
      );
      const membershipRows = this.api.extractCollection(memberships);

      this.members.set(
        membershipRows
          .filter((membership) => membership.team === this.teamId)
          .map((membership) => ({
            id: membership.id,
            name:
              typeof membership.user === 'string'
                ? membership.user
                : String(membership.user.username ?? membership.user.email ?? 'unknown-user'),
            role: membership.role,
          })),
      );
    } catch {
      this.members.set([]);
    }
  }

  async manageMember(member: MemberView): Promise<void> {
    const roleInput = window.prompt(
      `Set role for ${member.name} (admin, team_lead, engineer, viewer):`,
      member.role,
    );
    if (roleInput === null) {
      return;
    }

    const role = roleInput.trim();
    if (!this.allowedRoles.has(role)) {
      window.alert('Invalid role. Use one of: admin, team_lead, engineer, viewer.');
      return;
    }

    try {
      await firstValueFrom(this.api.patch(`/api/registry/team-memberships/${member.id}/`, { role }));
      this.members.update((rows) => rows.map((row) => (row.id === member.id ? { ...row, role } : row)));
    } catch {
      window.alert('Failed to update member role. Please try again.');
    }
  }
}
