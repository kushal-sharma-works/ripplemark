import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MenubarModule } from 'primeng/menubar';
import { ButtonModule } from 'primeng/button';
import { ThemeService } from '../core/services/theme.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MenubarModule, ButtonModule],
  template: `
    <div class="min-h-screen bg-[var(--surface-ground)] text-[var(--text-color)]">
      <header class="border-b border-[var(--surface-border)] p-3 flex items-center justify-between">
        <div class="text-xl font-semibold">Ripplemark</div>
        <button pButton icon="pi pi-moon" severity="contrast" size="small" (click)="theme.toggle()"></button>
      </header>
      <div class="grid md:grid-cols-[250px_1fr] min-h-[calc(100vh-64px)]">
        <aside class="border-r border-[var(--surface-border)] p-3 space-y-2">
          <a routerLink="/dashboard" routerLinkActive="font-semibold" class="block p-2 rounded hover:bg-[var(--surface-hover)]">Dashboard</a>
          <a routerLink="/graph" routerLinkActive="font-semibold" class="block p-2 rounded hover:bg-[var(--surface-hover)]">Dependency Graph</a>
          <a routerLink="/analysis" routerLinkActive="font-semibold" class="block p-2 rounded hover:bg-[var(--surface-hover)]">Change Analysis</a>
          <a routerLink="/registry" routerLinkActive="font-semibold" class="block p-2 rounded hover:bg-[var(--surface-hover)]">Service Registry</a>
          <a routerLink="/teams" routerLinkActive="font-semibold" class="block p-2 rounded hover:bg-[var(--surface-hover)]">Teams</a>
          <a routerLink="/snapshots" routerLinkActive="font-semibold" class="block p-2 rounded hover:bg-[var(--surface-hover)]">Snapshots</a>
        </aside>
        <main class="p-4 md:p-6 overflow-auto"><router-outlet /></main>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainLayoutComponent {
  readonly theme = inject(ThemeService);
}
