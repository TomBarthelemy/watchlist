import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { WatchlistSettingsComponent } from './components/watchlist-settings/watchlist-settings.component';
import { ActiveWatchlistService } from '@app/core/services/active-watchlist.service';

@Component({
  selector: 'app-watchlist-settings-page',
  standalone: true,
  imports: [WatchlistSettingsComponent],
  templateUrl: './watchlist-settings-page.component.html',
  styleUrl: './watchlist-settings-page.component.scss',
})
export class WatchlistSettingsPageComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private activeWatchlist = inject(ActiveWatchlistService);

  ngOnInit() {
    const listId = this.route.snapshot.paramMap.get('id') || '';
    if (listId) {
      this.activeWatchlist.setActiveListId(listId);
    }
  }
}

