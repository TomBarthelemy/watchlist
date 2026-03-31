import { effect, inject, Injectable, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { ActiveWatchlistService } from '@app/core/services/active-watchlist.service';
import { ListService, UserList } from './list.service';
import { SupaService } from '@app/core/services/supa.service';
import { filter, map, startWith } from 'rxjs';

export type PostLoginState = 'watchlist' | 'empty' | 'select';

@Injectable({ providedIn: 'root' })
export class WatchlistAccessService {
  private listService = inject(ListService);
  private activeWatchlist = inject(ActiveWatchlistService);
  private supa = inject(SupaService);
  private router = inject(Router);
  private readonly routerUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  resolvingPostLogin = signal(false);
  postLoginState = signal<PostLoginState>('watchlist');
  availableLists = signal<UserList[]>([]);
  selectingList = signal(false);
  creatingList = signal(false);
  postLoginError = signal<string | null>(null);
  private resolveRunId = 0;
  private initialResolutionDoneForUserId: string | null = null;

  constructor() {
    effect(
      () => {
        const user = this.supa.user();
        this.routerUrl();

        if (!user) {
          this.resolvingPostLogin.set(false);
          this.postLoginState.set('watchlist');
          this.availableLists.set([]);
          this.postLoginError.set(null);
          this.initialResolutionDoneForUserId = null;
          return;
        }

        const userId = user.id;
        const isInitialResolutionForUser = this.initialResolutionDoneForUserId !== userId;

        const currentPath = this.getCurrentPath();
        const shouldResolvePostLogin =
          currentPath === '/' ||
          currentPath === '/login' ||
          currentPath === '/watchlists';

        // Keep current context routes stable (e.g. /watchlist/:id, /profile).
        // Otherwise this resolver can clear active watchlist/items after a refresh.
        if (!shouldResolvePostLogin) {
          return;
        }

        this.resolvePostLoginNavigation({ autoOpenSingleWatchlist: isInitialResolutionForUser });
      },
      { allowSignalWrites: true }
    );
  }

  private getCurrentPath(): string {
    const routerPath = this.router.url?.split('?')[0] ?? '';
    const locationPath = globalThis.location?.pathname ?? '';

    // On hard refresh the router can transiently report '/' before it hydrates
    // the real deep-link URL. Prefer location pathname in that case.
    if (routerPath === '/' && locationPath && locationPath !== '/') {
      return locationPath;
    }

    return routerPath || locationPath || '/';
  }

  async selectWatchlist(listId: string) {
    this.selectingList.set(true);
    this.postLoginError.set(null);

    try {
      this.activeWatchlist.setActiveListId(listId);
      await this.router.navigate(['/watchlist', listId]);
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
      await this.router.navigate(['/watchlist', createdList.id]);
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

  private async resolvePostLoginNavigation(options?: { autoOpenSingleWatchlist?: boolean }) {
    const autoOpenSingleWatchlist = options?.autoOpenSingleWatchlist === true;
    const runId = ++this.resolveRunId;
    this.resolvingPostLogin.set(true);
    this.postLoginError.set(null);

    const userId = this.supa.user()?.id ?? null;

    try {
      const userLists = await this.listService.getUserLists();
      if (runId !== this.resolveRunId) return;

      if (userLists.length === 0) {
        this.availableLists.set([]);
        this.activeWatchlist.clearActiveListId();
        this.supa.items.set([]);
        this.postLoginState.set('empty');
        // Navigate away from /login to the gateway so the empty state is shown
        if (this.router.url.split('?')[0] === '/login') {
          await this.router.navigate(['/watchlists']);
        }
        return;
      }

      if (userLists.length === 1) {
        const singleListId = userLists[0].id;
        this.availableLists.set(userLists);
        if (autoOpenSingleWatchlist) {
          this.activeWatchlist.setActiveListId(singleListId);
          // Auto-navigate only right after auth/bootstrap; not on manual returns to /watchlists.
          const currentPath = this.router.url.split('?')[0];
          if (currentPath === '/login' || currentPath === '/watchlists') {
            await this.router.navigate(['/watchlist', singleListId]);
          }
        } else {
          this.activeWatchlist.clearActiveListId();
          this.supa.items.set([]);
          this.postLoginState.set('select');
        }
        return;
      }

      this.availableLists.set(userLists);
      this.activeWatchlist.clearActiveListId();
      this.supa.items.set([]);
      this.postLoginState.set('select');
      // Navigate away from /login to the gateway so the list is shown
      if (this.router.url.split('?')[0] === '/login') {
        await this.router.navigate(['/watchlists']);
      }
    } catch (error: any) {
      const message = this.formatErrorMessage(error);
      console.error('Post-login navigation failed:', error);
      this.postLoginError.set(message);
      this.activeWatchlist.clearActiveListId();
      this.supa.items.set([]);
      this.postLoginState.set(this.availableLists().length > 0 ? 'select' : 'empty');
    } finally {
      if (runId === this.resolveRunId) {
        if (userId) {
          this.initialResolutionDoneForUserId = userId;
        }
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
