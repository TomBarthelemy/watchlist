import { Routes } from '@angular/router';
import { WatchlistAccessPageComponent } from './features/watchlist-access/watchlist-access-page.component';
import { WatchlistMainPageComponent } from './features/watchlist-main/watchlist-main-page.component';
import { WatchlistMembersPageComponent } from './features/watchlist-members/watchlist-members-page.component';
import { WatchlistSettingsPageComponent } from './features/watchlist-settings/watchlist-settings-page.component';
import { authGuard, membershipGuard } from './core/guards';

/**
 * Application routes
 *
 * Routing structure:
 * - '' → Watchlist access gateway (selection, creation)
 * - 'watchlist/:id' → Main watchlist view with items (protected by auth + membership)
 * - 'watchlist/:id/members' → Member management (protected by auth + membership)
 * - 'watchlist/:id/settings' → Watchlist settings (protected by auth + membership)
 *
 * Guards:
 * - authGuard: Ensures user is authenticated
 * - membershipGuard: Ensures user is member of the referenced watchlist
 */
export const routes: Routes = [
  {
    path: '',
    component: WatchlistAccessPageComponent,
  },
  {
    path: 'watchlist/:id',
    component: WatchlistMainPageComponent,
    canActivate: [authGuard, membershipGuard],
  },
  {
    path: 'watchlist/:id/members',
    component: WatchlistMembersPageComponent,
    canActivate: [authGuard, membershipGuard],
  },
  {
    path: 'watchlist/:id/settings',
    component: WatchlistSettingsPageComponent,
    canActivate: [authGuard, membershipGuard],
  },
  // Wildcard route - redirect to home
  {
    path: '**',
    redirectTo: '',
  },
];

