import { Injectable, effect, signal } from '@angular/core';


@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<'light' | 'dark'>(
    (localStorage.getItem('theme') as 'light' | 'dark') ||
    (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  );

  constructor() {
    effect(() => {
      const t = this.theme();
      document.documentElement.setAttribute('data-theme', t);
      localStorage.setItem('theme', t);
    });

    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      if (!localStorage.getItem('theme')) this.set(e.matches ? 'dark' : 'light');
    });
  }

  set(t: 'light'|'dark') { this.theme.set(t); }
  toggle() { this.theme.update(v => (v === 'dark' ? 'light' : 'dark')); }
}

