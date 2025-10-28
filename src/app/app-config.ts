import { InjectionToken } from '@angular/core';

export interface AppConfig {
  supaUrl: string;
  supaAnon: string;
  listId: string;
  redirectUrl: string;
}

export const APP_CONFIG = new InjectionToken<AppConfig>('APP_CONFIG');
