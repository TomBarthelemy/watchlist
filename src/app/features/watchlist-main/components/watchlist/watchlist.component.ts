import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { PopcornEmitterDirective } from '@app/features/watchlist-main/directives/popcorn-emitter.directive';
import { SearchFormComponent } from '../search-form/search-form.component';
import { SupaService } from '@app/core/services/supa.service';
import { ActiveWatchlistService } from '@app/core/services/active-watchlist.service';
import { ListItemComponent } from '../list-item/list-item.component';
import { WatchlistAccessService } from '@app/features/watchlist-access/services/watchlist-access.service';

@Component({
  selector: 'app-watchlist',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    PopcornEmitterDirective,
    SearchFormComponent,
    ListItemComponent,
  ],
  templateUrl: './watchlist.component.html',
  styleUrls: ['./watchlist.component.scss'],
})
export class WatchlistComponent {
  private readonly supa = inject(SupaService);
  private readonly activeWatchlist = inject(ActiveWatchlistService);
  private readonly watchlistAccess = inject(WatchlistAccessService);
  private readonly router = inject(Router);

  total = computed(() => this.supa.items().length);
  seenCount = computed(() => this.supa.items().filter((i) => i.seen).length);
  currentListId = computed(() => this.activeWatchlist.activeListId());

  async goToWatchlists() {
    await this.watchlistAccess.showSelectionMode();
    await this.router.navigateByUrl('/');
  }
}

