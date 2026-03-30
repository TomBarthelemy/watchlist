import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { WatchlistMembersComponent } from './components/watchlist-members/watchlist-members.component';
import { ActiveWatchlistService } from '@app/core/services/active-watchlist.service';

@Component({
  selector: 'app-watchlist-members-page',
  standalone: true,
  imports: [WatchlistMembersComponent],
  templateUrl: './watchlist-members-page.component.html',
  styleUrl: './watchlist-members-page.component.scss',
})
export class WatchlistMembersPageComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private activeWatchlist = inject(ActiveWatchlistService);

  ngOnInit() {
    const listId = this.route.snapshot.paramMap.get('id') || '';
    if (listId) {
      this.activeWatchlist.setActiveListId(listId);
    }
  }
}

