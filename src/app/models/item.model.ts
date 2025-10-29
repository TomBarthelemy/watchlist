import { Category } from "../types/item-category.type";

export interface Item {
  id: string;
  list_id: string;
  title: string;
  category: Category;
  trailer_url?: string | null;
  seen: boolean;
  seen_at?: string | null;
  proposed_by: string; // user uuid
  created_at: string;
}