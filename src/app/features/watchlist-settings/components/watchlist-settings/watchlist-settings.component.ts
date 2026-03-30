import { Component, inject, input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { WatchlistSettingsService } from '../../services/watchlist-settings.service';
import { ActiveWatchlistService } from '@app/core/services/active-watchlist.service';
import { WatchlistAccessService } from '@app/features/watchlist-access/services/watchlist-access.service';
import { ConfirmDialogComponent } from '@app/shared/components/confirm-dialog/confirm-dialog.component';

/**
 * WatchlistSettingsComponent
 *
 * Manages watchlist settings and configuration.
 *
 * Features (to implement):
 * - Edit watchlist name
 * - Edit description
 * - Visibility control
 * - Deletion (owner only)
 *
 * Future enhancements:
 * - Collaboration settings
 * - Notification preferences
 * - Archive/unarchive
 * - Export options
 */
@Component({
  selector: 'app-watchlist-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ConfirmDialogComponent],
  templateUrl: './watchlist-settings.component.html',
  styleUrls: ['./watchlist-settings.component.scss'],
})
export class WatchlistSettingsComponent implements OnInit {
  watchlistId = input<string>('');
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private settingsService = inject(WatchlistSettingsService);
  private activeWatchlist = inject(ActiveWatchlistService);
  private watchlistAccess = inject(WatchlistAccessService);

  protected loading = signal(true);
  protected saving = signal(false);
  protected deleting = signal(false);
  protected error = signal<string | null>(null);
  protected success = signal<string | null>(null);
  protected resolvedWatchlistId = signal('');
  protected currentUserRole = signal<string | null>(null);
  protected createdAt = signal<string | null>(null);
  protected createdBy = signal<string | null>(null);
  protected deleteDialogOpen = signal(false);
  protected returnTo = signal<'watchlist' | 'gateway'>('watchlist');

  readonly form = this.fb.group({
    name: this.fb.nonNullable.control('', [
      Validators.required,
      Validators.minLength(2),
      Validators.maxLength(60),
    ]),
  });

  protected canDelete = () => this.currentUserRole() === 'owner';

  async ngOnInit() {
    this.resolvedWatchlistId.set(
      this.watchlistId() || this.route.snapshot.paramMap.get('id') || ''
    );
    const from = this.route.snapshot.queryParamMap.get('from');
    this.returnTo.set(from === 'gateway' ? 'gateway' : 'watchlist');
    const listId = this.resolvedWatchlistId();
    if (listId) {
      this.activeWatchlist.setActiveListId(listId);
    }
    await this.loadSettings();
  }

  async goBack() {
    const listId = this.resolvedWatchlistId();
    if (this.returnTo() === 'watchlist' && listId) {
      await this.router.navigate(['/watchlist', listId]);
      return;
    }

    await this.watchlistAccess.showSelectionMode();
    await this.router.navigateByUrl('/');
  }

  async saveName() {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    const listId = this.resolvedWatchlistId();
    if (!listId) return;

    this.saving.set(true);
    this.error.set(null);
    this.success.set(null);

    try {
      const name = this.form.controls.name.getRawValue();
      await this.settingsService.renameWatchlist(listId, name);
      this.success.set('Nom de la watchlist mis a jour.');
      await this.loadSettings(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur de mise a jour';
      this.error.set(message);
    } finally {
      this.saving.set(false);
    }
  }

  openDeleteDialog() {
    if (!this.canDelete() || this.deleting()) return;
    this.deleteDialogOpen.set(true);
  }

  cancelDeleteDialog() {
    this.deleteDialogOpen.set(false);
  }

  async confirmDeleteWatchlist() {
    if (!this.canDelete() || this.deleting()) return;

    const listId = this.resolvedWatchlistId();
    if (!listId) return;

    this.deleting.set(true);
    this.error.set(null);
    this.success.set(null);
    this.deleteDialogOpen.set(false);

    try {
      await this.settingsService.deleteWatchlist(listId);
      await this.watchlistAccess.showSelectionMode();
      await this.router.navigateByUrl('/');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur de suppression';
      this.error.set(message);
      this.deleting.set(false);
    }
  }

  private async loadSettings(showLoader = true) {
    const listId = this.resolvedWatchlistId();
    if (!listId) {
      this.loading.set(false);
      this.error.set('Identifiant de watchlist manquant.');
      return;
    }

    if (showLoader) this.loading.set(true);
    this.error.set(null);

    try {
      const settings = await this.settingsService.getSettings(listId);
      this.form.patchValue({ name: settings.name }, { emitEvent: false });
      this.currentUserRole.set(settings.currentUserRole);
      this.createdAt.set(settings.createdAt);
      this.createdBy.set(settings.createdBy);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur de chargement';
      this.error.set(message);
    } finally {
      if (showLoader) this.loading.set(false);
    }
  }
}

