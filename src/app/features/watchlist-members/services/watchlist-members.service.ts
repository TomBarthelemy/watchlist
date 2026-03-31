import { Injectable, inject } from '@angular/core';
import { SupaService } from '@app/core/services/supa.service';

export interface WatchlistMember {
  user_id: string;
  user_name: string;
  user_email: string;
  user_avatar_url: string | null;
  role: string;
}

@Injectable({ providedIn: 'root' })
export class WatchlistMembersService {
  private supaService = inject(SupaService);

  async getMembers(watchlistId: string): Promise<WatchlistMember[]> {
    const client = this.supaService.supa;
    const { data, error } = await client
      .from('list_members')
      .select(`
        user_id,
        role,
        users!inner (
          username,
          email,
          avatar_url
        )
      `)
      .eq('list_id', watchlistId)
      .order('user_id', { ascending: true });

    if (error) throw new Error('Failed to fetch members: ' + error.message);
    
    return (
      data?.map((m: any): WatchlistMember => {
        const userInfo = Array.isArray(m.users) ? m.users[0] : m.users;
        return {
          user_id: m.user_id,
          user_name: userInfo?.username || 'Unknown User',
          user_email: userInfo?.email || '',
          user_avatar_url: userInfo?.avatar_url || null,
          role: m.role,
        };
      }) || []
    );
  }

  async getMember(watchlistId: string, userId: string): Promise<WatchlistMember | null> {
    const client = this.supaService.supa;
    const { data, error } = await client
      .from('list_members')
      .select(`
        user_id,
        role,
        users!inner (
          username,
          email,
          avatar_url
        )
      `)
      .eq('list_id', watchlistId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw new Error('Failed to fetch member: ' + error.message);
    }

    if (!data) return null;

    const userInfo = Array.isArray(data.users) ? data.users[0] : data.users;
    return {
      user_id: data.user_id,
      user_name: userInfo?.username || 'Unknown User',
      user_email: userInfo?.email || '',
      user_avatar_url: userInfo?.avatar_url || null,
      role: data.role,
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
      .maybeSingle();

    if (error) {
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

