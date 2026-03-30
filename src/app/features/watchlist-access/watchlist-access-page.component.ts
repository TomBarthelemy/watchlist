import { Component } from '@angular/core';
import { WatchlistGatewayComponent } from './components/watchlist-gateway/watchlist-gateway.component';

@Component({
  selector: 'app-watchlist-access-page',
  standalone: true,
  imports: [WatchlistGatewayComponent],
  templateUrl: './watchlist-access-page.component.html',
  styleUrl: './watchlist-access-page.component.scss',
})
export class WatchlistAccessPageComponent {}

