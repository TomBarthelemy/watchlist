import { effect, inject, Injectable, signal } from '@angular/core';
import { ActiveWatchlistService } from '@app/core/services/active-watchlist.service';
import { ListService, UserList } from './list.service';
import { SupaService } from '@app/core/services/supa.service';

export type PostLoginState = 'watchlist' | 'empty' | 'select';

@Injectable({ providedIn: 'root' })
export class WatchlistAccessService {
  private listService = inject(ListService);
  private activeWatchlist = inject(ActiveWatchlistService);
  private supa = inject(SupaService);

  resolvingPostLogin = signal(false);
  postLoginState = signal<PostLoginState>('watchlist');
  availableLists = signal<UserList[]>([]);
  selectingList = signal(false);
  creatingList = signal(false);
  postLoginError = signal<string | null>(null);
  private resolveRunId = 0;

  constructor() {
    effect(
      () => {
        const user = this.supa.user();
        if (!user) {
          this.resolvingPostLogin.set(false);
          this.postLoginState.set('watchlist');
          this.availableLists.set([]);
          this.postLoginError.set(null);
          return;
        }

        this.resolvePostLoginNavigation();
      },
      { allowSignalWrites: true }
    );
  }

  async selectWatchlist(listId: string) {
    this.selectingList.set(true);
    this.postLoginError.set(null);

    try {
      this.activeWatchlist.setActiveListId(listId);
      await this.supa.loadItems();
      this.postLoginState.set('watchlist');
    } catch (error: any) {
      const message = this.formatErrorMessage(error);
      console.error('Watchlist selection failed:', error);
      this.postLoginError.set(message);
    } finally {
      this.selectingList.set(false);
    }
  }

  async createWatchlist(name: string) {
    this.creatingList.set(true);
    this.postLoginError.set(null);

    try {
      const createdList = await this.listService.createWatchlist(name);
      this.availableLists.update((lists) => [createdList, ...lists]);
      this.activeWatchlist.setActiveListId(createdList.id);
      await this.supa.loadItems();
      this.postLoginState.set('watchlist');
    } catch (error: any) {
      const message = this.formatErrorMessage(error);
      console.error('Watchlist creation failed:', error);
      this.postLoginError.set(message);
      throw error;
    } finally {
      this.creatingList.set(false);
    }
  }

  async showSelectionMode() {
    this.resolvingPostLogin.set(true);
    this.postLoginError.set(null);

    try {
      const userLists = await this.listService.getUserLists();
      this.availableLists.set(userLists);
      this.activeWatchlist.clearActiveListId();
      this.supa.items.set([]);
      this.postLoginState.set(userLists.length > 0 ? 'select' : 'empty');
    } catch (error: any) {
      const message = this.formatErrorMessage(error);
      this.postLoginError.set(message);
    } finally {
      this.resolvingPostLogin.set(false);
    }
  }

  private async resolvePostLoginNavigation() {
    const runId = ++this.resolveRunId;
    this.resolvingPostLogin.set(true);
    this.postLoginError.set(null);

    try {
      const userLists = await this.listService.getUserLists();
      if (runId !== this.resolveRunId) return;

      if (userLists.length === 0) {
        this.availableLists.set([]);
        this.activeWatchlist.clearActiveListId();
        this.supa.items.set([]);
        this.postLoginState.set('empty');
        return;
      }

      if (userLists.length === 1) {
        const previousActiveListId = this.activeWatchlist.getActiveListId();
        const singleListId = userLists[0].id;

        this.availableLists.set(userLists);
        this.activeWatchlist.setActiveListId(singleListId);
        this.postLoginState.set('watchlist');
        try {
          await this.supa.loadItems();
        } catch (error) {
          if (previousActiveListId && previousActiveListId !== singleListId) {
            this.activeWatchlist.setActiveListId(previousActiveListId);
            await this.supa.loadItems();
          } else {
            throw error;
          }
        }
        return;
      }

      this.availableLists.set(userLists);
      this.activeWatchlist.clearActiveListId();
      this.supa.items.set([]);
      this.postLoginState.set('select');
    } catch (error: any) {
      const message = this.formatErrorMessage(error);
      console.error('Post-login navigation failed:', error);
      this.postLoginError.set(message);
      this.activeWatchlist.clearActiveListId();
      this.supa.items.set([]);
      this.postLoginState.set(this.availableLists().length > 0 ? 'select' : 'empty');
    } finally {
      if (runId === this.resolveRunId) {
        this.resolvingPostLogin.set(false);
      }
    }
  }

  private formatErrorMessage(error: any): string {
    if (error?.message) return error.message;
    if (error?.error?.message) return error.error.message;
    return 'Erreur de chargement des watchlists';
  }
}
