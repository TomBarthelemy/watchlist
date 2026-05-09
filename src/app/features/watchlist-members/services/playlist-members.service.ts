import { Injectable, inject } from '@angular/core';
import { SupaService } from '@app/core/services/supa.service';
import { FriendService, FriendSummary } from '@app/features/friends/services/friend.service';

export interface PlaylistMember {
  user_id: string;
  user_name: string;
  user_email: string;
  user_avatar_url: string | null;
  role: string;
}

@Injectable({ providedIn: 'root' })
export class PlaylistMembersService {
  private readonly supaService = inject(SupaService);
  private readonly friendService = inject(FriendService);

  async getMembers(watchlistId: string): Promise<PlaylistMember[]> {
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
      data?.map((member: any): PlaylistMember => {
        const userInfo = Array.isArray(member.users) ? member.users[0] : member.users;
        return {
          user_id: member.user_id,
          user_name: userInfo?.username || 'Unknown User',
          user_email: userInfo?.email || '',
          user_avatar_url: userInfo?.avatar_url || null,
          role: member.role,
        };
      }) || []
    );
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

  async canEditMembers(watchlistId: string): Promise<boolean> {
    const role = await this.getCurrentUserRole(watchlistId);
    return role === 'owner' || role === 'editor';
  }

  async getInviteableFriends(watchlistId: string): Promise<FriendSummary[]> {
    const members = await this.getMembers(watchlistId);
    return this.friendService.getSelectableFriends(members.map((member) => member.user_id));
  }

  async inviteFriendToPlaylist(_watchlistId: string, _friendUserId: string): Promise<void> {
    return Promise.resolve();
  }

  async inviteEmailToPlaylist(_watchlistId: string, _email: string): Promise<void> {
    return Promise.resolve();
  }
}