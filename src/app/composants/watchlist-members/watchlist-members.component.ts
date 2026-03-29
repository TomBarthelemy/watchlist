import { Component, inject, input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SupaService } from '../../services/supa.service';

interface WatchlistMember {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  role: string;
  created_at: string;
}

/**
 * WatchlistMembersComponent
 *
 * Stage 7: Manage watchlist members
 *
 * Displays:
 * - List of current members with their roles (owner, member, etc.)
 * - Member actions (view, remove if permitted)
 *
 * Future features (not implemented yet):
 * - Email invitations
 * - Role assignment/modification
 * - Permission management
 * - Bulk operations
 *
 * Responsibilities:
 * - Display member list with roles
 * - Handle member-related UI
 * - Delegate data operations to WatchlistMembersService
 */
@Component({
  selector: 'app-watchlist-members',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './watchlist-members.component.html',
  styleUrls: ['./watchlist-members.component.scss'],
})
export class WatchlistMembersComponent implements OnInit {
  watchlistId = input<string>('');

  private supa = inject(SupaService);
  private route = inject(ActivatedRoute);

  protected members = signal<WatchlistMember[]>([]);
  protected loading = signal(false);
  protected error = signal<string | null>(null);

  async ngOnInit() {
    await this.loadMembers();
  }

  /**
   * Load members for the active watchlist
   */
  async loadMembers() {
    this.loading.set(true);
    this.error.set(null);

    try {
      const listId = this.watchlistId() || this.route.snapshot.paramMap.get('id') || '';
      if (!listId) {
        throw new Error('Identifiant de watchlist manquant');
      }
      const membersList = await this.fetchMembers(listId);
      this.members.set(membersList);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load members';
      this.error.set(message);
      console.error('Error loading members:', err);
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Get role label for display
   */
  getRoleLabel(role: string): string {
    const roleLabels: Record<string, string> = {
      owner: 'Propriétaire',
      editor: 'Éditeur',
      viewer: 'Spectateur',
    };
    return roleLabels[role] || role;
  }

  /**
   * Check if current user can remove a member
   */
  canRemoveMember(_memberRole: string): boolean {
    // TODO: Check current user's role from service
    // For now, only show action if user is owner (to implement with ACL)
    return false;
  }

  /**
   * Retry loading members
   */
  retryLoadMembers() {
    this.loadMembers();
  }

  private async fetchMembers(watchlistId: string): Promise<WatchlistMember[]> {
    const { data, error } = await this.supa.supa
      .from('list_members')
      .select('id, user_id, role, created_at')
      .eq('list_id', watchlistId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(error.message || 'Erreur de chargement des membres');
    }

    return (data || []).map((member: any) => ({
      id: member.id,
      user_id: member.user_id,
      user_name: `User ${member.user_id.substring(0, 8)}`,
      user_email: '',
      role: member.role,
      created_at: member.created_at,
    }));
  }
}
