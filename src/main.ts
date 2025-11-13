// main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig, APP_CONFIG, AppConfig } from './app/app.config';

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
      { provide: APP_CONFIG, useValue: cfg },
    ],
  });
})();
