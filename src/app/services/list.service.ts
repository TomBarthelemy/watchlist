import { inject, Injectable } from '@angular/core';
import { SupaService } from './supa.service';

interface ListRecord {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
}

interface ListMemberWithList {
  role: string | null;
  lists: ListRecord | ListRecord[] | null;
}

export interface UserList extends ListRecord {
  role: string | null;
}

@Injectable({ providedIn: 'root' })
export class ListService {
  private supaService = inject(SupaService);

  async getUserLists(): Promise<UserList[]> {
    const {
      data: { user },
      error: userError,
    } = await this.supaService.supa.auth.getUser();

    if (userError) throw userError;
    if (!user) return [];

    const { data, error } = await this.supaService.supa
      .from('list_members')
      .select(
        `
          role,
          lists!inner (
            id,
            name,
            created_by,
            created_at
          )
        `
      )
      .eq('user_id', user.id);

    if (error) throw error;

    const rows = (data ?? []) as ListMemberWithList[];
    return rows
      .map((row) => {
        const list = this.extractList(row.lists);
        if (!list) return null;

        return {
          id: list.id,
          name: list.name,
          created_by: list.created_by,
          created_at: list.created_at,
          role: row.role,
        };
      })
      .filter((list): list is UserList => list !== null)
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
  }

  async createWatchlist(name: string): Promise<UserList> {
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      throw new Error('Le nom de la watchlist doit contenir au moins 2 caracteres');
    }

    const {
      data: { user },
      error: userError,
    } = await this.supaService.supa.auth.getUser();

    if (userError) throw userError;
    if (!user) throw new Error('Utilisateur non connecte');

    const { data: createdList, error: createListError } = await this.supaService.supa
      .from('lists')
      .insert({
        name: trimmedName,
        created_by: user.id,
      })
      .select('id, name, created_by, created_at')
      .single<ListRecord>();

    if (createListError) throw createListError;

    const { error: addMemberError } = await this.supaService.supa
      .from('list_members')
      .insert({
        list_id: createdList.id,
        user_id: user.id,
        role: 'owner',
      });

    if (addMemberError) {
      throw new Error(
        addMemberError.message || 'La watchlist a ete creee mais le role owner n\'a pas pu etre ajoute'
      );
    }

    return {
      ...createdList,
      role: 'owner',
    };
  }

  private extractList(lists: ListRecord | ListRecord[] | null): ListRecord | null {
    if (!lists) return null;
    return Array.isArray(lists) ? lists[0] ?? null : lists;
  }
}