import { Component, HostListener, computed, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, FormControl } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { startWith } from 'rxjs';
import { SupaService } from '@app/core/services/supa.service';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Filter, SortKey } from '@app/types';
import { Item } from '@app/models';
import { ConfirmDialogComponent } from '@app/shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-list-item',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatSlideToggleModule,
    MatTooltipModule,
    ConfirmDialogComponent,
  ],
  templateUrl: './list-item.component.html',
  styleUrl: './list-item.component.scss',
})
export class ListItemComponent {
  private readonly supa = inject(SupaService);
  private readonly fb = inject(FormBuilder);
  readonly isMobile = signal(this.getIsMobileViewport());

  readonly seenCount = input(0);
  readonly totalCount = input(0);

  private readonly imgBase = 'https://image.tmdb.org/t/p/';

  // --- Filtre (Reactive Forms)
  filterCtrl: FormControl<Filter> = this.fb.control<Filter>('Tout', {
    nonNullable: true,
  });
  filter = toSignal(
    this.filterCtrl.valueChanges.pipe(startWith(this.filterCtrl.value)),
    {
      initialValue: this.filterCtrl.value,
    }
  );
  sortCtrl = this.fb.control<SortKey>('created_desc', { nonNullable: true });
  sort = toSignal(
    this.sortCtrl.valueChanges.pipe(startWith(this.sortCtrl.value)),
    {
      initialValue: this.sortCtrl.value,
    }
  );

  // --- Liste filtrée (signals)
  filtered = computed(() => {
    const f = this.filter();
    let arr = this.supa.items();

    if (f === 'A_voir') arr = arr.filter((i) => !i.seen);
    else if (f === 'Vus') arr = arr.filter((i) => i.seen);
    else if (f === 'Mes_ajouts') arr = arr.filter((i) => this.isSelf(i));
    else if (f === 'Ajouts_autres') arr = arr.filter((i) => !this.isSelf(i));
    else if (f !== 'Tout') arr = arr.filter((i) => i.category === f);

    return arr;
  });

  sorted = computed(() => {
    const key = this.sort();
    const src = this.filtered();

    // helpers de comparaison
    const byTitle = (a: string, b: string) =>
      a.localeCompare(b, 'fr', { sensitivity: 'base' });

    const byCreated = (a: string, b: string) =>
      new Date(a).getTime() - new Date(b).getTime();

    switch (key) {
      case 'title_asc':
        return [...src].sort((a, b) => byTitle(a.title, b.title));
      case 'title_desc':
        return [...src].sort((a, b) => byTitle(b.title, a.title));
      case 'created_asc':
        return [...src].sort((a, b) => byCreated(a.created_at, b.created_at));
      case 'created_desc':
        return [...src].sort((a, b) => byCreated(b.created_at, a.created_at));
    }
  });

  selfId = computed(() => this.supa.user()?.id ?? null);

  isLoading = computed(() => this.supa.loading());

  // --- Confirm unsee (protect seen date from accidental removal)
  confirmUnseeItem = signal<Item | null>(null);

  async requestSeenToggle(item: Item) {
    if (item.seen) {
      this.confirmUnseeItem.set(item);
      return;
    }

    await this.supa.toggleSeen(item);
  }

  cancelUnsee() {
    this.confirmUnseeItem.set(null);
  }

  async executeUnsee() {
    const item = this.confirmUnseeItem();
    this.confirmUnseeItem.set(null);
    if (item) await this.supa.toggleSeen(item);
  }

  // --- Confirm delete
  confirmDeleteItem = signal<Item | null>(null);

  confirmDelete(item: Item, event: Event) {
    event.stopPropagation();
    this.confirmDeleteItem.set(item);
  }

  cancelDelete() {
    this.confirmDeleteItem.set(null);
  }

  async executeDelete() {
    const item = this.confirmDeleteItem();
    this.confirmDeleteItem.set(null);
    if (item) await this.supa.removeItem(item.id);
  }

  async remove(id: string) {
    await this.supa.removeItem(id);
  }

  formatDate(dateStr: string): string {
    const [year, month, day] = dateStr.split('-');
    return `${day}-${month}-${year}`;
  }

  isSelf(item: Item): boolean {
    const me = this.selfId();
    return !!me && item.proposed_by === me;
  }

  getPosterUrl(path: string | null | undefined): string {
    if (!path) {
      return '/assets/icons/poster-placeholder.svg';
    }
    // Mobile stays lightweight, desktop gets a sharper poster variant.
    const size = this.isMobile() ? 'w185' : 'w342';
    return `${this.imgBase}${size}${path}`;
  }

  splitGenres(concatedGenres: string | null | undefined): string[] {
    if (!concatedGenres) return [];
    return concatedGenres
      .split(',')
      .map((genre) => this.normalizeGenreLabel(genre.trim()))
      .filter((genre) => !!genre);
  }

  @HostListener('window:resize')
  onWindowResize() {
    this.isMobile.set(this.getIsMobileViewport());
  }

  private getIsMobileViewport(): boolean {
    return typeof window !== 'undefined' && window.matchMedia('(max-width: 540px)').matches;
  }

  private normalizeGenreLabel(genre: string): string {
    return genre.toLowerCase() === 'science-fiction et fantastique'
      ? 'SF et fantastique'
      : genre;
  }

  private getVisibleGenreLimit(): number {
    return this.isMobile() ? 2 : 3;
  }

  getVisibleGenres(genreStr: string | null | undefined): string[] {
    return this.splitGenres(genreStr).slice(0, this.getVisibleGenreLimit());
  }

  getExtraGenresCount(genreStr: string | null | undefined): number {
    return Math.max(0, this.splitGenres(genreStr).length - this.getVisibleGenreLimit());
  }

  getAllGenresLabel(genreStr: string | null | undefined): string {
    return this.splitGenres(genreStr).join(', ');
  }
}

