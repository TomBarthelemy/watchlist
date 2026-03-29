import { Component } from '@angular/core';
import { WatchlistGatewayComponent } from '../../composants/watchlist-gateway/watchlist-gateway.component';

/**
 * WatchlistAccessPage
 *
 * Container page for the watchlist access gateway.
 * Allows users to view available watchlists, create new ones, or select one.
 * This is the entry point after authentication.
 */
@Component({
  selector: 'app-watchlist-access-page',
  standalone: true,
  imports: [WatchlistGatewayComponent],
  template: `<app-watchlist-gateway />`,
  styles: [
    `
      :host {
        display: flex;
        flex: 1 1 auto;
        min-height: 0;
        min-width: 0;
        width: 100%;
      }
    `,
  ],
})
export class WatchlistAccessPage {}
