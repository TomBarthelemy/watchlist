import { Component } from '@angular/core';
import { WatchlistComponent } from '../../composants/watchlist/watchlist.component';

/**
 * WatchlistMainPage
 *
 * Container page for the main watchlist view with items.
 * Displays items in the active watchlist with filtering, search, and actions.
 */
@Component({
  selector: 'app-watchlist-main-page',
  standalone: true,
  imports: [WatchlistComponent],
  template: `<app-watchlist />`,
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
export class WatchlistMainPage {}
