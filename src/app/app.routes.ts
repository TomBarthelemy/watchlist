import { Routes } from '@angular/router';
import { WatchlistAccessPage } from './pages/watchlist-access/watchlist-access.page';
import { WatchlistMainPage } from './pages/watchlist-main/watchlist-main.page';
import { WatchlistMembersComponent } from './composants/watchlist-members/watchlist-members.component';
import { WatchlistSettingsComponent } from './composants/watchlist-settings/watchlist-settings.component';

/**
 * Application routes
 *
 * Routing structure:
 * - '' → Watchlist access gateway (selection, creation)
 * - 'watchlist/:id' → Main watchlist view with items
 * - 'watchlist/:id/members' → Member management
 * - 'watchlist/:id/settings' → Watchlist settings
 *
 * Future: Add auth guards and role-based access
 */
export const routes: Routes = [
  {
    path: '',
    component: WatchlistAccessPage,
  },
  {
    path: 'watchlist/:id',
    component: WatchlistMainPage,
  },
  {
    path: 'watchlist/:id/members',
    component: WatchlistMembersComponent,
  },
  {
    path: 'watchlist/:id/settings',
    component: WatchlistSettingsComponent,
  },
  // Wildcard route - redirect to home
  {
    path: '**',
    redirectTo: '',
  },
];
