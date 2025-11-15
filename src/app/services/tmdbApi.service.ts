import { inject, Injectable } from '@angular/core';
import { APP_CONFIG } from '../app.config';
import { Observable } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { TmdbSearchResponse } from '../models/tmdb/search/tmdb-search-response.model';
import { TmdbGenreListResponse } from '../models/tmdb/genre/tmdb-genre-list-response.model';

@Injectable({ providedIn: 'root' })
export class TmdbApiService {
  private cfg = inject(APP_CONFIG);
    private readonly http = inject(HttpClient);

  private readonly apiKey = this.cfg.tmdbApiKey;
  private readonly baseUrl = 'https://api.themoviedb.org/3';

searchMulti(query: string, page = 1): Observable<TmdbSearchResponse> {
  const params = new HttpParams()
    .set('api_key', this.apiKey)
    .set('query', query)
    .set('page', page.toString())
    .set('language', 'fr-FR')
    .set('include_adult', 'false');

  return this.http.get<TmdbSearchResponse>(`${this.baseUrl}/search/multi`, { params });
}

  getMovieGenres(): Observable<TmdbGenreListResponse> {
    const params = new HttpParams()
      .set('api_key', this.apiKey)
      .set('language', 'fr-FR');
    return this.http.get<TmdbGenreListResponse>(`${this.baseUrl}/genre/movie/list`, { params });
  }

  getTvGenres(): Observable<TmdbGenreListResponse> {
    const params = new HttpParams()
      .set('api_key', this.apiKey)
      .set('language', 'fr-FR');
    return this.http.get<TmdbGenreListResponse>(`${this.baseUrl}/genre/tv/list`, { params });
  }
}
