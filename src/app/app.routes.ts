import { Routes } from '@angular/router';
import { AuthComponent } from './shared/components/auth/auth.component';
import { WatchlistAccessPageComponent } from './features/watchlist-access/watchlist-access-page.component';
import { WatchlistMainPageComponent } from './features/watchlist-main/watchlist-main-page.component';
import { WatchlistMembersPageComponent } from './features/watchlist-members/watchlist-members-page.component';
import { WatchlistSettingsPageComponent } from './features/watchlist-settings/watchlist-settings-page.component';
import { ProfilePageComponent } from './features/profile/profile-page.component';
import { authGuard, guestGuard, membershipGuard } from './core/guards';

/**
 * Application routes
 *
 * Routing structure:
 * - 'login'           → Authentication form (guest only)
 * - 'watchlists'      → Watchlist selection / creation gateway (auth required)
 * - 'watchlist/:id'           → Main watchlist view (auth + membership)
 * - 'watchlist/:id/members'   → Member management (auth + membership)
 * - 'watchlist/:id/settings'  → Watchlist settings (auth + membership)
 *
 * Guards:
 * - guestGuard:      Redirects authenticated users away from /login
 * - authGuard:       Ensures user is authenticated
 * - membershipGuard: Ensures user is member of the referenced watchlist
 */
export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    component: AuthComponent,
    canActivate: [guestGuard],
  },
  {
    path: 'watchlists',
    component: WatchlistAccessPageComponent,
    canActivate: [authGuard],
  },
  {
    path: 'profile',
    component: ProfilePageComponent,
    canActivate: [authGuard],
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
  // Wildcard route - redirect to login
  {
    path: '**',
    redirectTo: 'login',
  },
];

