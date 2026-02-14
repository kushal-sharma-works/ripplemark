import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';

@Component({
  standalone: true,
  selector: 'app-teams-page',
  imports: [RouterLink, CardModule],
  template: `
    <h1 class="text-2xl font-semibold mb-4">Teams & Ownership</h1>
    <div class="grid md:grid-cols-2 gap-4">
      @for (team of teams; track team.id) {
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
  readonly teams = [
    { id: 'platform', name: 'Platform', members: 8, serviceCount: 5 },
    { id: 'ui', name: 'UI', members: 4, serviceCount: 2 },
  ];
}
