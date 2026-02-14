import { Injectable, effect, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly mode = signal<ThemeMode>((localStorage.getItem('ripplemark-theme') as ThemeMode) || 'light');

  constructor() {
    effect(() => {
      const theme = this.mode();
      document.documentElement.classList.toggle('dark', theme === 'dark');
      localStorage.setItem('ripplemark-theme', theme);
    });
  }

  toggle(): void {
    this.mode.update((m) => (m === 'dark' ? 'light' : 'dark'));
  }
}
