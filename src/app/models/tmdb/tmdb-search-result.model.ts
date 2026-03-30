export interface TmdbSearchResult {
  id: number;
  title?: string;        
  name?: string;         
  media_type?: 'movie' | 'tv';
  genre_ids: number[];
  overview: string;
  poster_path: string | null;
  release_date?: string;
  first_air_date?: string;
  original_language?: string;
}
