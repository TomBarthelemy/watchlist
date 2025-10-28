import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  FormControl,
} from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { startWith } from 'rxjs';
import { Category, SupaService } from '../../services/supa.service';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

type Filter = 'Tout' | 'Film' | 'Série' | 'Animé' | 'A_voir' | 'Vus';
type SortKey = 'created_desc' | 'created_asc' | 'title_asc' | 'title_desc';

@Component({
  selector: 'app-watchlist',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatSlideToggleModule],
  templateUrl: './watchlist.component.html',
  styleUrls: ['./watchlist.component.scss'],
})
export class WatchlistComponent {
  // --- Formulaire d’ajout
  form = this.fb.group({
    title: this.fb.control<string>('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(1),
        Validators.maxLength(100),
      ],
    }),
    category: this.fb.control<Category>('Film', { nonNullable: true }),
  });

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

  total = computed(() => this.supa.items().length);
  seenCount = computed(() => this.supa.items().filter((i) => i.seen).length);

  constructor(public supa: SupaService, private fb: FormBuilder) {}

  async addItem() {
    if (this.form.invalid) return;
    const { title, category } = this.form.getRawValue();

    const query = this.buildTrailerQuery(title, category);
    const trailer_url = this.youtubeSearchUrl(query);

    await this.supa.addItem({
      title: title.trim(),
      category: category as Category,
      trailer_url: trailer_url,
    });
    this.form.reset({ title: '', category: 'Film' });
  }

  async toggle(it: any) {
    await this.supa.toggleSeen(it);
  }
  async remove(id: string) {
    await this.supa.removeItem(id);
  }

  formatDate(dateStr: string): string {
    const [year, month, day] = dateStr.split('-');
    return `${day}-${month}-${year}`;
  }

  private buildTrailerQuery(title: string, category: Category) {
    const base = title.trim();
    const suffix =
      category === 'Série'
        ? 'official trailer season 1'
        : category === 'Animé'
        ? 'anime official trailer'
        : 'official trailer';

    return [base, suffix].join(' ');
  }

  private youtubeSearchUrl(query: string) {
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(
      query
    )}`;
  }
}
