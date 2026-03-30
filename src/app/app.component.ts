import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthComponent } from './shared/components/auth/auth.component';
import { SupaService } from './core/services/supa.service';
import { ThemeService } from './core/services/theme.service';
import { WatchlistAccessService } from './features/watchlist-access/services/watchlist-access.service';
import { ActiveWatchlistService } from './core/services/active-watchlist.service';

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
  imports: [CommonModule, RouterOutlet, RouterLink, AuthComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  theme = inject(ThemeService);
  supa = inject(SupaService);
  activeWatchlist = inject(ActiveWatchlistService);
  private router = inject(Router);
  private watchlistAccess = inject(WatchlistAccessService);

  currentListId = computed(() => this.activeWatchlist.activeListId());
  hasActiveWatchlist = computed(() => !!this.currentListId());
  nextTheme = computed<'light' | 'dark'>(() =>
    this.theme.theme() === 'dark' ? 'light' : 'dark'
  );
  themeToggleLabel = computed(() =>
    this.nextTheme() === 'light' ? 'Theme clair' : 'Theme sombre'
  );
  mobileMenuOpen = signal(false);

  toggleMobileMenu() {
    if (!this.hasActiveWatchlist()) return;
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
    await this.router.navigateByUrl('/');
  }

  async goHome() {
    this.closeMobileMenu();
    if (this.supa.user()) {
      await this.watchlistAccess.showSelectionMode();
    }
    await this.router.navigateByUrl('/');
  }
}

