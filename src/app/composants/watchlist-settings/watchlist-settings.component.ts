import { Component, input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { inject } from '@angular/core';

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
  imports: [CommonModule],
  templateUrl: './watchlist-settings.component.html',
  styleUrls: ['./watchlist-settings.component.scss'],
})
export class WatchlistSettingsComponent implements OnInit {
  watchlistId = input<string>('');
  private route = inject(ActivatedRoute);

  protected loading = signal(false);
  protected error = signal<string | null>(null);
  protected success = signal<string | null>(null);
  protected resolvedWatchlistId = signal('');

  ngOnInit() {
    this.resolvedWatchlistId.set(this.watchlistId() || this.route.snapshot.paramMap.get('id') || '');
  }
}
