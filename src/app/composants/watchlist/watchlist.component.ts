import { Component, computed, inject, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  FormControl,
} from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  of,
  startWith,
  Subscription,
  switchMap,
  tap,
  filter,
  map,
} from 'rxjs';
import { SupaService } from '../../services/supa.service';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { Filter } from '../../types/item-filter.type';
import { SortKey } from '../../types/item-sort.type';
import { Category } from '../../types/item-category.type';
import { Item } from '../../models/item.model';
import { PopcornEmitterDirective } from '../../directives/popcorn-emitter.directive';
import { TmdbApiService } from '../../services/tmdbApi.service';
import { TmdbSearchResult } from '../../models/tmdb/search/tmdb-search-result.model';
import { TmdbSearchResponse } from '../../models/tmdb/search/tmdb-search-response.model';
import { GenreStore } from '../../stores/genre.store';

@Component({
  selector: 'app-watchlist',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatSlideToggleModule,
    PopcornEmitterDirective,
  ],
  templateUrl: './watchlist.component.html',
  styleUrls: ['./watchlist.component.scss'],
})
export class WatchlistComponent implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly tmdb = inject(TmdbApiService);
  private readonly supa = inject(SupaService);
  private readonly genreStore = inject(GenreStore);

  // --- Formulaire d'ajout
  form = this.fb.group({
    title: this.fb.nonNullable.control<string>('', {
      validators: [
        Validators.required,
        Validators.minLength(1),
        Validators.maxLength(100),
      ],
    }),
    category: this.fb.control<Category>('Film', { nonNullable: true }),
  });

  // résultats de l'autocomplete
  readonly results = signal<TmdbSearchResult[]>([]);
  readonly selectedResult = signal<TmdbSearchResult | null>(null);
  showResults = false;

  private titleSub: Subscription;

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

  total = computed(() => this.supa.items().length);
  seenCount = computed(() => this.supa.items().filter((i) => i.seen).length);

  formOpen = signal(false);
  justAdded = signal(false);
  itemsLoaded = signal(this.supa.loading());

  constructor() {
    // On lance le chargement des genres une fois
    void this.genreStore.ensureLoaded();

    // écoute de la saisie pour l'autocomplete
    this.titleSub = this.form.controls.title.valueChanges
      .pipe(
        map((value) => (value ?? '').toString().trim()),
        tap((text) => {
          this.selectedResult.set(null);
          if (!text) {
            this.results.set([]);
          }
        }),
        filter((text) => text.length >= 2),
        switchMap((text) =>
          this.tmdb.searchMulti(text).pipe(
            catchError(() =>
              of<TmdbSearchResponse>({
                page: 1,
                total_pages: 1,
                total_results: 0,
                results: [],
              })
            )
          )
        )
      )
      .subscribe((resp) => {
        this.results.set(resp.results ?? []);
      });
  }

  ngOnDestroy(): void {
    this.titleSub?.unsubscribe();
  }

  // titre affiché
  getTitle(item: TmdbSearchResult): string {
    return item.title || item.name || '';
  }

  // année
  getYear(item: TmdbSearchResult): string | null {
    const date = item.release_date || item.first_air_date;
    return date ? date.substring(0, 4) : null;
  }

  // label de catégorie pour affichage
  getCategoryLabel(item: TmdbSearchResult): string {
    const cat = this.mapMediaTypeToCategory(item);
    return cat;
  }

  private mapMediaTypeToCategory(item: TmdbSearchResult): Category {
    // 1. Récupérer la bonne map (films vs séries)
    const genreMap =
      item.media_type === 'tv'
        ? this.genreStore.tvGenreMap()
        : this.genreStore.movieGenreMap();

    const genreNames = (item.genre_ids ?? [])
      .map((id) => genreMap.get(id))
      .filter((n): n is string => !!n);

    const hasAnimation = genreNames.includes('Animation');
    const hasKids = genreNames.includes('Kids');
    const hasFamily = genreNames.includes('Familial');
    const lang = item.original_language;

    // 2. Animé
    if (hasAnimation && lang === 'ja') {
      return 'Animé';
    }

    // 3. Dessin animé
    if (hasAnimation && (hasKids || hasFamily) && lang !== 'ja') {
      return 'Dessin animé';
    }

    // 4. Série
    if (item.media_type === 'tv') {
      return 'Série';
    }

    // 5. Film
    return 'Film';
  }

  selectResult(item: TmdbSearchResult): void {
    this.selectedResult.set(item);
    const title = this.getOptionLabel(item);
    const category = this.mapMediaTypeToCategory(item);

    this.form.patchValue({
      title,
      category,
    });
  }

  onBlur(): void {
    setTimeout(() => {
      this.showResults = false;
    }, 150);
  }

  getOptionLabel(item: TmdbSearchResult): string {
    const title = this.getTitle(item);
    const category = this.getCategoryLabel(item);
    const year = this.getYear(item);

    return year ? `${title} · ${category} · ${year}` : `${title} · ${category}`;
  }

  onSelectChange(event: Event): void {
    const select = event.target as HTMLSelectElement | null;
    if (!select) return;

    const id = select.value;
    const numericId = Number(id);
    const item = this.results().find((r) => r.id === numericId);

    if (item) {
      this.selectResult(item);
      this.showResults = false;
    }
  }

  async addItem() {
    if (this.form.invalid) return;

    const selected = this.selectedResult();
    if (!selected) return;

    const { title, category } = this.form.getRawValue();
    const safeTitle = title.trim();
    const cat = category as Category;

    const query = this.buildTrailerQuery(safeTitle, cat);
    const trailer_url = this.youtubeSearchUrl(query);

    await this.supa.addItem({
      title: safeTitle,
      category: cat,
      trailer_url,
    });

    this.form.reset({ title: '', category: 'Film' });
    this.selectedResult.set(null);
    this.results.set([]);

    this.justAdded.set(true);
    setTimeout(() => {
      this.justAdded.set(false);
    }, 900);
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

  isSelf(item: Item): boolean {
    const me = this.selfId();
    return !!me && item.proposed_by === me;
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
