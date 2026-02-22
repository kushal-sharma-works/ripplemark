import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { firstValueFrom } from 'rxjs';
import { ApiService, PaginatedResponse } from '../../core/services/api.service';

@Component({
  standalone: true,
  selector: 'app-teams-page',
  imports: [RouterLink, CardModule],
  template: `
    <h1 class="text-2xl font-semibold mb-4">Teams & Ownership</h1>
    <div class="grid md:grid-cols-2 gap-4">
      @for (team of teams(); track team.id) {
        <p-card [header]="team.name">
          <p>Members: {{ team.members }}</p>
          <p>Services: {{ team.serviceCount }}</p>
          <a [routerLink]="['/teams', team.id]" class="text-blue-500">View Team</a>
        </p-card>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamsPage {
  private readonly api = inject(ApiService);

  readonly teams = signal<Array<{ id: string; name: string; members: number; serviceCount: number }>>([]);

  constructor() {
    void this.loadTeams();
  }

  private async loadTeams(): Promise<void> {
    try {
      const [teams, memberships, ownerships] = await Promise.all([
        firstValueFrom(
          this.api.get<PaginatedResponse<{ id: string; name: string }> | Array<{ id: string; name: string }>>('/api/registry/teams/'),
        ),
        firstValueFrom(
          this.api.get<PaginatedResponse<{ team: string }> | Array<{ team: string }>>('/api/registry/team-memberships/'),
        ),
        firstValueFrom(
          this.api.get<PaginatedResponse<{ team: string }> | Array<{ team: string }>>('/api/registry/ownerships/'),
        ),
      ]);

      const teamRows = this.api.extractCollection(teams);
      const membershipRows = this.api.extractCollection(memberships);
      const ownershipRows = this.api.extractCollection(ownerships);

      const memberCountByTeam = new Map<string, number>();
      for (const membership of membershipRows) {
        const teamId = membership.team;
        memberCountByTeam.set(teamId, (memberCountByTeam.get(teamId) ?? 0) + 1);
      }

      const serviceCountByTeam = new Map<string, number>();
      for (const ownership of ownershipRows) {
        const teamId = ownership.team;
        serviceCountByTeam.set(teamId, (serviceCountByTeam.get(teamId) ?? 0) + 1);
      }

      this.teams.set(
        teamRows.map((team) => ({
          id: team.id,
          name: team.name,
          members: memberCountByTeam.get(team.id) ?? 0,
          serviceCount: serviceCountByTeam.get(team.id) ?? 0,
        })),
      );
    } catch {
      this.teams.set([]);
    }
  }
}
