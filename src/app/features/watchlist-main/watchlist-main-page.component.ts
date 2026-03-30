import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { WatchlistComponent } from './components/watchlist/watchlist.component';
import { ActiveWatchlistService } from '@app/core/services/active-watchlist.service';
import { SupaService } from '@app/core/services/supa.service';

@Component({
  selector: 'app-watchlist-main-page',
  standalone: true,
  imports: [WatchlistComponent],
  templateUrl: './watchlist-main-page.component.html',
  styleUrl: './watchlist-main-page.component.scss',
})
export class WatchlistMainPageComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private activeWatchlist = inject(ActiveWatchlistService);
  private supa = inject(SupaService);

  async ngOnInit() {
    const listId = this.route.snapshot.paramMap.get('id') || '';
    if (!listId) return;
    this.activeWatchlist.setActiveListId(listId);
    try {
      await this.supa.loadItems();
    } catch (error) {
      console.error('Erreur de chargement de la watchlist:', error);
    }
  }
}

