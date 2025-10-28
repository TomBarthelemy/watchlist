import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { AppComponent } from './app/app.component';
import { APP_CONFIG, type AppConfig } from './app/app-config';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';


async function loadConfig(): Promise<AppConfig> {
  const res = await fetch('/app-config.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Cannot load app-config.json (${res.status})`);
  return await res.json();
}

(async () => {
  const cfg = await loadConfig();
  await bootstrapApplication(AppComponent, {
    providers: [
      provideHttpClient(),
      { provide: APP_CONFIG, useValue: cfg },
      provideAnimationsAsync()
    ],
  });
})();
