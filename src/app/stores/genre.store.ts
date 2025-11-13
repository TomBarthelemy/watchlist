// stores/genre.store.ts
import { inject, Injectable, signal, computed } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { TmdbApiService } from '../services/tmdbApi.service';
import { TmdbGenre } from '../models/tmdb/genre/tmdb-genre.model';

@Injectable({ providedIn: 'root' })
export class GenreStore {
  private readonly api = inject(TmdbApiService);

  private loaded = false;
  private readonly movieGenresSignal = signal<TmdbGenre[]>([]);
  private readonly tvGenresSignal = signal<TmdbGenre[]>([]);

  readonly movieGenres = computed(() => this.movieGenresSignal());
  readonly tvGenres = computed(() => this.tvGenresSignal());

  readonly movieGenreMap = computed(
    () =>
      new Map(this.movieGenres().map((g) => [g.id, g.name] as [number, string]))
  );

  readonly tvGenreMap = computed(
    () =>
      new Map(this.tvGenres().map((g) => [g.id, g.name] as [number, string]))
  );

  async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    const [movieResp, tvResp] = await Promise.all([
      firstValueFrom(this.api.getMovieGenres()),
      firstValueFrom(this.api.getTvGenres()),
    ]);
    this.movieGenresSignal.set(movieResp.genres ?? []);
    this.tvGenresSignal.set(tvResp.genres ?? []);
    this.loaded = true;
    console.log("movieGenresSignal", this.movieGenresSignal())
    console.log("tvGenresSignal", this.tvGenresSignal())
  }

  getGenreNames(genreIds: number[], mediaType: 'movie' | 'tv'): string[] {
    const map =
      mediaType === 'movie' ? this.movieGenreMap() : this.tvGenreMap();
    return genreIds
      .map((id) => map.get(id))
      .filter((name): name is string => !!name);
  }
}
