import { inject, Injectable } from '@angular/core';
import { SupaService } from '@app/core/services/supa.service';

interface ListRecord {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
}

export interface WatchlistSettingsData {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
  currentUserRole: string | null;
}

@Injectable({ providedIn: 'root' })
export class WatchlistSettingsService {
  private supaService = inject(SupaService);

  async getSettings(watchlistId: string): Promise<WatchlistSettingsData> {
    const client = this.supaService.supa;
    const currentUser = this.supaService.user();

    const { data: list, error: listError } = await client
      .from('lists')
      .select('id, name, created_by, created_at')
      .eq('id', watchlistId)
      .maybeSingle<ListRecord>();

    if (listError || !list) {
      throw new Error(listError?.message || 'Watchlist introuvable');
    }

    let currentUserRole: string | null = null;
    if (currentUser?.id) {
      const { data: roleData, error: roleError } = await client
        .from('list_members')
        .select('role')
        .eq('list_id', watchlistId)
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (roleError) {
        throw new Error(roleError.message || 'Impossible de recuperer le role utilisateur');
      }
      currentUserRole = roleData?.role ?? null;
    }

    return {
      id: list.id,
      name: list.name,
      createdBy: list.created_by,
      createdAt: list.created_at,
      currentUserRole,
    };
  }

  async renameWatchlist(watchlistId: string, name: string): Promise<string> {
    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 60) {
      throw new Error('Le nom doit contenir entre 2 et 60 caracteres');
    }

    const { error } = await this.supaService.supa
      .from('lists')
      .update({ name: trimmedName })
      .eq('id', watchlistId);

    if (error) {
      throw new Error(error.message || 'Impossible de renommer la watchlist');
    }

    // Re-fetch the confirmed name (avoids RETURNING clause RLS issues)
    const { data, error: fetchError } = await this.supaService.supa
      .from('lists')
      .select('name')
      .eq('id', watchlistId)
      .maybeSingle();

    if (fetchError) {
      throw new Error(fetchError.message);
    }
    if (!data) {
      throw new Error('Mise à jour non appliquée (droits insuffisants ?)');
    }
    return data.name;
  }

  async deleteWatchlist(watchlistId: string): Promise<void> {
    const { error } = await this.supaService.supa
      .from('lists')
      .delete()
      .eq('id', watchlistId);

    if (error) {
      throw new Error(error.message || 'Impossible de supprimer la watchlist');
    }
  }
}
