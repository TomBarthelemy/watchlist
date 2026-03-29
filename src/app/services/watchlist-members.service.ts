import { Injectable, inject } from '@angular/core';
import { SupaService } from './supa.service';

export interface WatchlistMember {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  role: string;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class WatchlistMembersService {
  private supaService = inject(SupaService);

  async getMembers(watchlistId: string): Promise<WatchlistMember[]> {
    const client = this.supaService.supa;
    const { data, error } = await client
      .from('list_members')
      .select('id, user_id, role, created_at')
      .eq('list_id', watchlistId)
      .order('created_at', { ascending: true });

    if (error) throw new Error('Failed to fetch members: ' + error.message);
    return (
      data?.map((m: any): WatchlistMember => ({
      id: m.id,
      user_id: m.user_id,
        user_name: 'User ' + m.user_id.substring(0, 8),
        user_email: '',
      role: m.role,
      created_at: m.created_at,
      })) || []
    );
  }

  async getMember(watchlistId: string, userId: string): Promise<WatchlistMember | null> {
    const client = this.supaService.supa;
    const { data, error } = await client
      .from('list_members')
      .select('id, user_id, role, created_at')
      .eq('list_id', watchlistId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error('Failed to fetch member: ' + error.message);
    }
    return {
      id: data.id,
      user_id: data.user_id,
      user_name: 'User ' + data.user_id.substring(0, 8),
      user_email: '',
      role: data.role,
      created_at: data.created_at,
    };
  }

  async getCurrentUserRole(watchlistId: string): Promise<string | null> {
    const client = this.supaService.supa;
    const currentUser = this.supaService.user();
    if (!currentUser?.id) return null;

    const { data, error } = await client
      .from('list_members')
      .select('role')
      .eq('list_id', watchlistId)
      .eq('user_id', currentUser.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error('Failed to fetch user role: ' + error.message);
    }
    return data?.role || null;
  }

  async isOwner(watchlistId: string): Promise<boolean> {
    const role = await this.getCurrentUserRole(watchlistId);
    return role === 'owner';
  }

  async canEditMembers(watchlistId: string): Promise<boolean> {
    return this.isOwner(watchlistId);
  }
}
