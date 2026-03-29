import { Component, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { WatchlistComponent } from '../watchlist/watchlist.component';
import { WatchlistAccessService } from '../../services/watchlist-access.service';
import { SupaService } from '../../services/supa.service';
import { UserList } from '../../services/list.service';

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
  imports: [CommonModule, ReactiveFormsModule, WatchlistComponent],
  templateUrl: './watchlist-gateway.component.html',
  styleUrls: ['./watchlist-gateway.component.scss'],
})
export class WatchlistGatewayComponent {
  private fb = inject(FormBuilder);

  protected access = inject(WatchlistAccessService);
  protected supa = inject(SupaService);

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
    this.access.selectWatchlist(listId);
  }

  trackByListId(_index: number, list: UserList) {
    return list.id;
  }
}
