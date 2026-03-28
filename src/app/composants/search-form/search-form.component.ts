import { Component, inject, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  catchError,
  of,
  Subscription,
  switchMap,
  tap,
  filter,
  map,
} from 'rxjs';
import { SupaService } from '../../services/supa.service';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { Category } from '../../types/item-category.type';
import { TmdbApiService } from '../../services/tmdbApi.service';
import { TmdbSearchResult } from '../../models/tmdb/search/tmdb-search-result.model';
import { TmdbSearchResponse } from '../../models/tmdb/search/tmdb-search-response.model';
import { GenreStore } from '../../stores/genre.store';
import { TmdbItemInsert } from '../../models/tmdb/tmbd-item-insert.model';

@Component({
  selector: 'app-search-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatSlideToggleModule],
  templateUrl: './search-form.component.html',
  styleUrl: './search-form.component.scss',
})
export class SearchFormComponent implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly tmdb = inject(TmdbApiService);
  private readonly genreStore = inject(GenreStore);
  private readonly supa = inject(SupaService);

  // --- Formulaire d'ajout
  form = this.fb.group({
    title: this.fb.nonNullable.control<string>('', {
      validators: [
        Validators.required,
        Validators.minLength(1),
        Validators.maxLength(100),
      ],
    }),
  });

  // résultats de l'autocomplete
  readonly results = signal<TmdbSearchResult[]>([]);
  readonly selectedResult = signal<TmdbSearchResult | null>(null);
  showResults = false;

  private titleSub: Subscription;
  private blurTimeoutId: any;

  justAdded = signal(false);
  duplicateDialogOpen = signal(false);

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
        this.showResults = this.results().length > 0;
      });
  }

  ngOnDestroy(): void {
    this.titleSub?.unsubscribe();
    if (this.blurTimeoutId) {
      clearTimeout(this.blurTimeoutId);
    }
  }

  getTitle(item: TmdbSearchResult): string {
    return item.title || item.name || '';
  }

  getYear(item: TmdbSearchResult): string | null {
    const date = item.release_date || item.first_air_date;
    return date ? date.substring(0, 4) : null;
  }

  getCategoryLabel(item: TmdbSearchResult): string {
    const cat = this.mapMediaTypeToCategory(item);
    return cat;
  }

  getResultLabel(item: TmdbSearchResult): string {
    const title = this.getTitle(item);
    const category = this.getCategoryLabel(item);
    const year = this.getYear(item);

    return year ? `${title} · ${category} · ${year}` : `${title} · ${category}`;
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

  onInputFocus(): void {
    this.showResults = true;
  }

  onBlur(): void {
    this.blurTimeoutId = setTimeout(() => {
      this.showResults = false;
    }, 150);
  }

  onOptionMouseDown(event: MouseEvent, item: TmdbSearchResult): void {
    event.preventDefault(); 
    if (this.blurTimeoutId) {
      clearTimeout(this.blurTimeoutId);
      this.blurTimeoutId = null;
    }

    this.selectResult(item);
    this.showResults = false;
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

  selectResult(item: TmdbSearchResult): void {
    this.selectedResult.set(item);
    const title = this.getResultLabel(item);
    this.form.patchValue(
      {
        title,
      },
      { emitEvent: false }
    );
  }

  async addItem() {
    if (this.form.invalid) return;

    const selected = this.selectedResult();
    if (!selected) return;

    if (this.isDuplicateItem(selected)) {
      this.duplicateDialogOpen.set(true);
      return;
    }

    const safeTitle = this.getTitle(selected).trim();
    const cat = this.mapMediaTypeToCategory(selected);

    const trailerQuery = this.buildTrailerQuery(safeTitle, cat);
    const trailer_url = this.youtubeSearchUrl(trailerQuery);

    const insertObj = this.mapSearchResultToTmdbItemInsert(
      selected,
      trailer_url
    );

    // INSERT
    await this.supa.addTmdbItem(insertObj);

    // reset du form
    this.form.reset({ title: '' });
    this.selectedResult.set(null);
    this.results.set([]);

    this.justAdded.set(true);
    setTimeout(() => this.justAdded.set(false), 900);
  }

  closeDuplicateDialog() {
    this.duplicateDialogOpen.set(false);
    this.form.reset({ title: '' });
    this.selectedResult.set(null);
    this.results.set([]);
    this.showResults = false;
  }

  private isDuplicateItem(selected: TmdbSearchResult): boolean {
    const selectedTitle = this.normalizeText(this.getTitle(selected));
    const selectedCategory = this.mapMediaTypeToCategory(selected);
    const selectedYear = this.getYear(selected);

    return this.supa.items().some((it) => {
      const sameTitle = this.normalizeText(it.title) === selectedTitle;
      const sameCategory = it.category === selectedCategory;
      const sameYear = !selectedYear || !it.year || String(it.year) === selectedYear;
      return sameTitle && sameCategory && sameYear;
    });
  }

  private normalizeText(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private mapSearchResultToTmdbItemInsert(
    selected: TmdbSearchResult,
    trailerUrl: string
  ): TmdbItemInsert {
    const title = this.getTitle(selected);
    const category = this.mapMediaTypeToCategory(selected);
    const year = this.getYear(selected);

    const genreMap =
      selected.media_type === 'tv'
        ? this.genreStore.tvGenreMap()
        : this.genreStore.movieGenreMap();

    const genreNames = (selected.genre_ids ?? [])
      .map((id) => genreMap.get(id))
      .filter((x): x is string => !!x);

    return {
      title,
      category,
      genre: genreNames.join(', '),
      overview: selected.overview ?? null,
      poster_path: selected.poster_path ?? null,
      year: year ? Number(year) : null,
      trailer_url: trailerUrl ?? null,
      seen: false,
      seen_at: null,
    };
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
