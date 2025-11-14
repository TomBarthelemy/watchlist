import { Category } from '../../types/item-category.type';

export interface TmdbItem {
  id: string;
  list_id: string;

  title: string;
  category: Category;
  genre: string;
  overview?: string | null;
  poster_path?: string | null;
  year?: number | null;
  trailer_url?: string | null;

  seen: boolean;
  seen_at?: string | null;

  proposed_by: string;
  created_at: string;
}
