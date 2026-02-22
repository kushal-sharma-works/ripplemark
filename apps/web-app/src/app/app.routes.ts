import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./layouts/auth-layout.component').then((m) => m.AuthLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () => import('./features/auth/login.page').then((m) => m.LoginPage),
      },
      {
        path: 'google-callback',
        loadComponent: () =>
          import('./features/auth/google-callback.page').then((m) => m.GoogleCallbackPage),
      },
    ],
  },
  {
    path: '',
    loadComponent: () => import('./layouts/main-layout.component').then((m) => m.MainLayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        data: { preload: true },
        loadComponent: () => import('./features/dashboard/dashboard.page').then((m) => m.DashboardPage),
      },
      {
        path: 'graph',
        data: { preload: true },
        loadComponent: () => import('./features/graph/graph.page').then((m) => m.GraphPage),
      },
      {
        path: 'analysis',
        loadComponent: () => import('./features/analysis/analysis.page').then((m) => m.AnalysisPage),
      },
      {
        path: 'registry',
        loadComponent: () => import('./features/registry/registry.page').then((m) => m.RegistryPage),
      },
      {
        path: 'registry/:id',
        loadComponent: () => import('./features/registry/registry-detail.page').then((m) => m.RegistryDetailPage),
      },
      {
        path: 'teams',
        loadComponent: () => import('./features/teams/teams.page').then((m) => m.TeamsPage),
      },
      {
        path: 'teams/:id',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/teams/team-detail.page').then((m) => m.TeamDetailPage),
      },
      {
        path: 'snapshots',
        loadComponent: () => import('./features/snapshots/snapshots.page').then((m) => m.SnapshotsPage),
      },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
