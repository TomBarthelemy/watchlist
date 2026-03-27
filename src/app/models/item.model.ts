import { Category } from "../types/item-category.type";

export interface Item {
  id: string;
  list_id: string;
  title: string;
  category: Category;
  overview?: string | null;
  poster_path?: string | null;
  year?: number | null;
  genre?: string | null;
  trailer_url?: string | null;
  seen: boolean;
  seen_at?: string | null;
  proposed_by: string;
  created_at: string;
}