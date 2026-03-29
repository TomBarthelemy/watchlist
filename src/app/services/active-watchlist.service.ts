import { inject, Injectable, signal } from '@angular/core';
import { APP_CONFIG } from '../app.config';

const ACTIVE_LIST_STORAGE_KEY = 'watchlist.activeListId';

@Injectable({ providedIn: 'root' })
export class ActiveWatchlistService {
  private cfg = inject(APP_CONFIG);

  activeListId = signal<string | null>(null);

  constructor() {
    const savedListId = this.readFromStorage();
    this.activeListId.set(savedListId ?? this.cfg.listId ?? null);
  }

  getActiveListId(): string | null {
    return this.activeListId();
  }

  setActiveListId(listId: string) {
    this.activeListId.set(listId);
    this.writeToStorage(listId);
  }

  clearActiveListId() {
    this.activeListId.set(null);
    this.removeFromStorage();
  }

  private readFromStorage(): string | null {
    try {
      return globalThis.localStorage?.getItem(ACTIVE_LIST_STORAGE_KEY) ?? null;
    } catch {
      return null;
    }
  }

  private writeToStorage(listId: string) {
    try {
      globalThis.localStorage?.setItem(ACTIVE_LIST_STORAGE_KEY, listId);
    } catch {
      // Ignore storage errors (private mode, denied access, etc.).
    }
  }

  private removeFromStorage() {
    try {
      globalThis.localStorage?.removeItem(ACTIVE_LIST_STORAGE_KEY);
    } catch {
      // Ignore storage errors (private mode, denied access, etc.).
    }
  }
}
