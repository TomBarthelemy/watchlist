import { Injectable, inject } from '@angular/core';
import { SupaService } from '@app/core/services/supa.service';

export type WatchlistProgress = {
  seen: number;
  total: number;
};

interface ItemProgressRow {
  list_id: string;
  seen: boolean;
}

@Injectable({ providedIn: 'root' })
export class WatchlistStatsService {
  private readonly supaService = inject(SupaService);

  async getProgressByListIds(listIds: string[]): Promise<Record<string, WatchlistProgress>> {
    const uniqueIds = [...new Set(listIds.filter(Boolean))];
    if (uniqueIds.length === 0) {
      return {};
    }

    const base: Record<string, WatchlistProgress> = Object.fromEntries(
      uniqueIds.map((id) => [id, { seen: 0, total: 0 }]),
    );

    const { data, error } = await this.supaService.supa
      .from('tmdb_item')
      .select('list_id, seen')
      .in('list_id', uniqueIds);

    if (error) {
      throw error;
    }

    for (const row of (data ?? []) as ItemProgressRow[]) {
      const listId = row.list_id;
      if (!base[listId]) {
        base[listId] = { seen: 0, total: 0 };
      }

      base[listId].total += 1;
      if (row.seen) {
        base[listId].seen += 1;
      }
    }

    return base;
  }
}
