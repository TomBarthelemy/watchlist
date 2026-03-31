import {
  ApplicationConfig,
  provideZoneChangeDetection,
  InjectionToken,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { routes } from './app.routes';


export interface AppConfig {
  supaUrl: string;
  supaAnon: string;
  listId: string;
  redirectUrl: string;
  tmdbApiKey: string;
  avatarBucket?: string;
}

export const APP_CONFIG = new InjectionToken<AppConfig>('APP_CONFIG');

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(),
    provideAnimationsAsync(),
  ],
};
