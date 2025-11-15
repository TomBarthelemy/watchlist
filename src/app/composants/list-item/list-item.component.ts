import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, FormControl } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { startWith } from 'rxjs';
import { SupaService } from '../../services/supa.service';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { Filter } from '../../types/item-filter.type';
import { SortKey } from '../../types/item-sort.type';
import { Item } from '../../models/item.model';

@Component({
  selector: 'app-list-item',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatSlideToggleModule],
  templateUrl: './list-item.component.html',
  styleUrl: './list-item.component.scss',
})
export class ListItemComponent {
  private readonly supa = inject(SupaService);
  private readonly fb = inject(FormBuilder);

  private readonly imgBase = 'https://image.tmdb.org/t/p/';

  expandedId: string | null = null;

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

  itemsLoaded = signal(this.supa.loading());

  async toggle(it: any) {
    await this.supa.toggleSeen(it);
  }
  async remove(id: string) {
    await this.supa.removeItem(id);
  }

  toggleExpanded(id: string): void {
    this.expandedId = this.expandedId === id ? null : id;
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
    // w185 = très bon ratio qualité/poids pour des vignettes de 64–100px
    return `${this.imgBase}w185${path}`;
  }

splitGenres(concatedGenres: string | null | undefined): string[] {
  if (!concatedGenres) return [];
  return concatedGenres
    .split(',')
    .map((genre) => genre.trim())
    .filter((genre) => !!genre);
}
}
