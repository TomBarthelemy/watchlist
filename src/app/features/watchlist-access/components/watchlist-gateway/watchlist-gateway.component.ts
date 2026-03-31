import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { WatchlistAccessService } from '@app/features/watchlist-access/services/watchlist-access.service';
import { SupaService } from '@app/core/services/supa.service';
import { UserList } from '@app/features/watchlist-access/services/list.service';
import { WatchlistProgress, WatchlistStatsService } from '@app/features/watchlist-access/services/watchlist-stats.service';

/**
 * WatchlistGatewayComponent
 *
 * Orchestrates user access to watchlists:
 * - Initial state resolution (empty, select from existing, or direct to watchlist)
 * - Watchlist creation with validation
 * - Watchlist selection and activation
 * - Displays the main watchlist once selected
 *
 * Responsibilities:
 * - Display logic for all post-login states
 * - Form management for watchlist creation
 * - User interactions (select, create)
 * - Integration with WatchlistAccessService for business logic
 */
@Component({
  selector: 'app-watchlist-gateway',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './watchlist-gateway.component.html',
  styleUrls: ['./watchlist-gateway.component.scss'],
})
export class WatchlistGatewayComponent {
  private fb = inject(FormBuilder);
  private statsService = inject(WatchlistStatsService);
  private progressLoadRequestId = 0;

  readonly access: WatchlistAccessService = inject(WatchlistAccessService);
  readonly supa: SupaService = inject(SupaService);
  readonly progressByListId = signal<Record<string, WatchlistProgress>>({});
  private didBootstrapFallbackLoad = false;

  createWatchlistForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(60)]],
  });

  constructor() {
    effect(() => {
      const isBusy = this.access.creatingList() || this.access.selectingList();
      const control = this.createWatchlistForm.controls.name;
      if (isBusy && control.enabled) {
        control.disable({ emitEvent: false });
      } else if (!isBusy && control.disabled) {
        control.enable({ emitEvent: false });
      }
    });

    effect(() => {
      const lists = this.access.availableLists();
      const userId = this.supa.user()?.id;

      if (!userId || lists.length === 0) {
        this.progressByListId.set({});
        return;
      }

      const requestId = ++this.progressLoadRequestId;
      const listIds = lists.map((list) => list.id);

      void this.statsService.getProgressByListIds(listIds)
        .then((progressMap) => {
          if (this.progressLoadRequestId !== requestId) return;
          this.progressByListId.set(progressMap);
        })
        .catch(() => {
          if (this.progressLoadRequestId !== requestId) return;
          this.progressByListId.set({});
        });
    }, { allowSignalWrites: true });

    // Mobile PWA safeguard: if /watchlists opens with a restored session but no lists loaded yet,
    // trigger a one-time explicit load to avoid a blank gateway state.
    effect(() => {
      const userId = this.supa.user()?.id;
      const isResolving = this.access.resolvingPostLogin();
      const listsCount = this.access.availableLists().length;
      const state = this.access.postLoginState();

      if (!userId || isResolving || this.didBootstrapFallbackLoad) return;
      if (listsCount > 0 || state === 'empty') return;

      const path = globalThis.location?.pathname ?? '';
      if (path !== '/watchlists') return;

      this.didBootstrapFallbackLoad = true;
      void this.access.showSelectionMode();
    }, { allowSignalWrites: true });
  }

  getProgressLabel(listId: string): string {
    const progress = this.progressByListId()[listId] ?? { seen: 0, total: 0 };
    return `${progress.seen}/${progress.total} vus`;
  }

  /**
   * Handle watchlist creation from form submission
   */
  async submitCreateWatchlist() {
    if (this.access.creatingList() || this.access.selectingList() || this.createWatchlistForm.invalid) {
      this.createWatchlistForm.markAllAsTouched();
      return;
    }

    const name = this.createWatchlistForm.getRawValue().name?.trim() ?? '';
    try {
      await this.access.createWatchlist(name);
      this.createWatchlistForm.reset({ name: '' });
    } catch {
      // Error state is already handled in the access service
    }
  }

  /**
   * Handle watchlist selection from list
   */
  selectWatchlist(listId: string) {
    if (this.access.selectingList() || this.access.creatingList()) return;
    this.access.selectWatchlist(listId);
  }

  onItemSpace(event: Event, listId: string) {
    event.preventDefault();
    this.selectWatchlist(listId);
  }

  trackByListId(_index: number, list: UserList) {
    return list.id;
  }
}

