import { TmdbSearchResult } from "./tmdb-search-result.model";

export interface TmdbSearchResponse {
  page: number;
  results: TmdbSearchResult[];
  total_pages: number;
  total_results: number;
}
