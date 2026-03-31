import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { PopcornEmitterDirective } from '@app/features/watchlist-main/directives/popcorn-emitter.directive';
import { SearchFormComponent } from '../search-form/search-form.component';
import { SupaService } from '@app/core/services/supa.service';
import { ListItemComponent } from '../list-item/list-item.component';
import { WatchlistAccessService } from '@app/features/watchlist-access/services/watchlist-access.service';

@Component({
  selector: 'app-watchlist',
  standalone: true,
  imports: [
    CommonModule,
    PopcornEmitterDirective,
    SearchFormComponent,
    ListItemComponent,
  ],
  templateUrl: './watchlist.component.html',
  styleUrls: ['./watchlist.component.scss'],
})
export class WatchlistComponent {
  private readonly supa = inject(SupaService);
  private readonly watchlistAccess = inject(WatchlistAccessService);
  private readonly router = inject(Router);

  total = computed(() => this.supa.items().length);
  seenCount = computed(() => this.supa.items().filter((i) => i.seen).length);

  async goToWatchlists() {
    await this.watchlistAccess.showSelectionMode();
    await this.router.navigateByUrl('/');
  }
}

