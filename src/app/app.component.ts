import { Component, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { SupaService } from './core/services/supa.service';
import { ThemeService } from './core/services/theme.service';
import { WatchlistAccessService } from './features/watchlist-access/services/watchlist-access.service';
import { ActiveWatchlistService } from './core/services/active-watchlist.service';
import { OnlinePresenceComponent } from './shared/components/online-presence/online-presence.component';
import { UserProfileService } from './core/services/user-profile.service';
import { WatchlistMember, WatchlistMembersService } from './features/watchlist-members/services/watchlist-members.service';

type PresenceMember = {
  id: string;
  name: string;
  avatarUrl: string | null;
  isOnline: boolean;
};

/**
 * AppComponent
 *
 * Root application shell that orchestrates high-level layout and structure.
 *
 * Responsibilities:
 * - Application header (branding, theme toggle, user presence, logout)
 * - Authentication state routing (auth form vs. router outlet)
 * - High-level layout container
 * - Router outlet for authenticated pages/routes
 *
 * Delegates all other logic to specialized services and page components:
 * - AuthComponent: authentication flow
 * - Routed pages: watchlist access, main view, members, settings
 * - Services: state management, data fetching, theme
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, OnlinePresenceComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  theme = inject(ThemeService);
  supa = inject(SupaService);
  activeWatchlist = inject(ActiveWatchlistService);
  profile = inject(UserProfileService);
  private membersService = inject(WatchlistMembersService);
  private router = inject(Router);
  private watchlistAccess = inject(WatchlistAccessService);
  private membersLoadRequestId = 0;
  private readonly watchlistMembers = signal<WatchlistMember[]>([]);

  currentListId = computed(() => this.activeWatchlist.activeListId());
  hasActiveWatchlist = computed(() => !!this.currentListId());

  private readonly _routerUrl = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(e => e.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );
  isOnLoginPage = computed(() => (this._routerUrl() ?? '').split('?')[0] === '/login');
  isAuthenticated = computed(() => !!this.supa.user());
  shouldShowHamburger = computed(() => this.isAuthenticated() && !this.isOnLoginPage());
  isOnWatchlistPage = computed(() => /^\/watchlist\/[^/]+(\?|$)/.test(this._routerUrl() ?? ''));
  /** True for watchlist active page, members page, and settings page — the 3 "watchlist context" pages */
  isOnWatchlistContextPage = computed(() => /^\/watchlist\/[^/]+/.test(this._routerUrl() ?? ''));
  presenceUsers = computed<PresenceMember[]>(() => {
    const meId = this.supa.user()?.id;
    const onlineUsers =
      this.supa.onlineUsers()
        .filter((u) => !u.isSelf)
    ;
    const onlineSet = new Set(onlineUsers.map((u) => u.id));

    return this.watchlistMembers()
      .filter((m) => !!m.user_id && m.user_id !== meId)
      .map((m) => ({
        id: m.user_id,
        name: m.user_name,
        avatarUrl: m.user_avatar_url,
        isOnline: onlineSet.has(m.user_id),
      }))
      .sort((a, b) =>
        a.isOnline === b.isOnline
          ? a.name.localeCompare(b.name)
          : a.isOnline
          ? -1
          : 1,
      );
  });

  /** Presence shown in watchlist context pages and only if there are other members. */
  shouldShowPresence = computed(() =>
    this.isOnWatchlistContextPage() &&
    this.presenceUsers().length > 0
  );
  activeWatchlistProgress = computed(() => {
    const seen = this.supa.items().filter((item) => item.seen).length;
    const total = this.supa.items().length;
    return { seen, total };
  });

  activeWatchlistProgressLabel = computed(() => {
    const progress = this.activeWatchlistProgress();
    return `${progress.seen}/${progress.total} vus`;
  });

  constructor() {
    effect(() => {
      const user = this.supa.user();
      if (!user) {
        this.profile.profile.set(null);
        this.watchlistMembers.set([]);
        return;
      }

      void this.profile.loadCurrentProfile();
    }, { allowSignalWrites: true });

    effect(() => {
      const listId = this.activeWatchlist.activeListId();
      const userId = this.supa.user()?.id;

      if (!listId || !userId) {
        this.watchlistMembers.set([]);
        return;
      }

      const requestId = ++this.membersLoadRequestId;

      void this.membersService.getMembers(listId)
        .then((members) => {
          if (this.membersLoadRequestId !== requestId) return;
          this.watchlistMembers.set(members);
        })
        .catch(() => {
          if (this.membersLoadRequestId !== requestId) return;
          this.watchlistMembers.set([]);
        });
    }, { allowSignalWrites: true });

    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      takeUntilDestroyed(),
    ).subscribe(() => {
      this.mobileMenuOpen.set(false);
    });
  }

  nextTheme = computed<'light' | 'dark'>(() =>
    this.theme.theme() === 'dark' ? 'light' : 'dark'
  );
  themeToggleLabel = computed(() =>
    this.nextTheme() === 'light' ? 'Theme clair' : 'Theme sombre'
  );
  mobileMenuOpen = signal(false);

  toggleMobileMenu() {
    if (!this.shouldShowHamburger()) return;
    this.mobileMenuOpen.update((isOpen) => !isOpen);
  }

  closeMobileMenu() {
    this.mobileMenuOpen.set(false);
  }

  toggleTheme() {
    this.theme.toggle();
  }

  async signOut() {
    this.closeMobileMenu();
    await this.supa.signOut();
    await this.router.navigateByUrl('/login');
  }

  async goHome() {
    this.closeMobileMenu();
    this.activeWatchlist.clearActiveListId();
    if (this.supa.user()) {
      await this.watchlistAccess.showSelectionMode();
    }
    await this.router.navigateByUrl('/watchlists');
  }

  async goToProfile() {
    this.closeMobileMenu();
    await this.router.navigateByUrl('/profile');
  }
}

