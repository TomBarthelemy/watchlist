import { inject, Injectable } from '@angular/core';
import { SupaService } from '@app/core/services/supa.service';

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

  private async resolveCurrentUserId(): Promise<string | null> {
    // Prefer session first: more stable on startup with persisted auth.
    const {
      data: { session },
      error: sessionError,
    } = await this.supaService.supa.auth.getSession();

    if (sessionError) throw sessionError;
    if (session?.user?.id) return session.user.id;

    const {
      data: { user },
      error: userError,
    } = await this.supaService.supa.auth.getUser();

    if (userError) throw userError;
    return user?.id ?? null;
  }

  async getUserLists(): Promise<UserList[]> {
    const userId = await this.resolveCurrentUserId();
    if (!userId) return [];

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
      .eq('user_id', userId);

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

    const userId = await this.resolveCurrentUserId();
    if (!userId) throw new Error('Utilisateur non connecte');

    const { data: createdList, error: createListError } = await this.supaService.supa
      .from('lists')
      .insert({
        name: trimmedName,
        created_by: userId,
      })
      .select('id, name, created_by, created_at')
      .single<ListRecord>();

    if (createListError) throw createListError;

    const { error: addMemberError } = await this.supaService.supa
      .from('list_members')
      .insert({
        list_id: createdList.id,
        user_id: userId,
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
