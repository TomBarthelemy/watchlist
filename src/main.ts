// main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig, APP_CONFIG, AppConfig } from './app/app.config';
import { isDevMode } from '@angular/core';
import { provideServiceWorker } from '@angular/service-worker';

async function loadConfig(): Promise<AppConfig> {
  const res = await fetch('app-config.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Cannot load app-config.json (${res.status})`);
  return await res.json();
}

(async () => {
  const cfg = await loadConfig();

  await bootstrapApplication(AppComponent, {
    ...appConfig,
    providers: [
      ...(appConfig.providers ?? []),
      { provide: APP_CONFIG, useValue: cfg }, provideServiceWorker('ngsw-worker.js', {
            enabled: !isDevMode(),
            registrationStrategy: 'registerWhenStable:30000'
          }),
    ],
  });
})();
