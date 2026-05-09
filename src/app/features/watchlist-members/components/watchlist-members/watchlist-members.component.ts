import { Component, inject, input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  PlaylistMember,
  PlaylistMembersService,
} from '../../services/playlist-members.service';
import { WatchlistAccessService } from '@app/features/watchlist-access/services/watchlist-access.service';
import { FriendSummary } from '@app/features/friends/services/friend.service';
import { FriendSelectorComponent } from '@app/shared/components/friend-selector/friend-selector.component';
import { InvitationEmailFieldComponent } from '@app/shared/components/invitation-email-field/invitation-email-field.component';

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
  imports: [CommonModule, FriendSelectorComponent, InvitationEmailFieldComponent],
  templateUrl: './watchlist-members.component.html',
  styleUrls: ['./watchlist-members.component.scss'],
})
export class WatchlistMembersComponent implements OnInit {
  watchlistId = input<string>('');

  private membersService = inject(PlaylistMembersService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private watchlistAccess = inject(WatchlistAccessService);

  protected members = signal<PlaylistMember[]>([]);
  protected loading = signal(false);
  protected error = signal<string | null>(null);
  protected currentUserRole = signal<string | null>(null);
  protected canManageInvites = signal(false);
  protected inviteableFriends = signal<FriendSummary[]>([]);
  protected inviteFeedback = signal<string | null>(null);
  protected resolvedWatchlistId = signal('');
  protected returnTo = signal<'watchlist' | 'gateway'>('watchlist');

  async ngOnInit() {
    const listId = this.watchlistId() || this.route.snapshot.paramMap.get('id') || '';
    this.resolvedWatchlistId.set(listId);
    const from = this.route.snapshot.queryParamMap.get('from');
    this.returnTo.set(from === 'gateway' ? 'gateway' : 'watchlist');
    await this.loadMembers();
  }

  /**
   * Load members for the active watchlist
   */
  async loadMembers() {
    this.loading.set(true);
    this.error.set(null);

    try {
      const listId = this.resolvedWatchlistId();
      if (!listId) {
        throw new Error('Identifiant de watchlist manquant');
      }
      const [membersList, userRole, canManageInvites, inviteableFriends] = await Promise.all([
        this.membersService.getMembers(listId),
        this.membersService.getCurrentUserRole(listId),
        this.membersService.canEditMembers(listId),
        this.membersService.getInviteableFriends(listId),
      ]);
      this.members.set(membersList);
      this.currentUserRole.set(userRole);
      this.canManageInvites.set(canManageInvites);
      this.inviteableFriends.set(inviteableFriends);
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
    };
    return roleLabels[role] || role;
  }

  protected initials(name: string): string {
    return name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || '?';
  }

  protected avatarSrc(url: string | null): string | null {
    if (!url) return null;

    let next = url;
    next = next.replace(/=s\d+-c(?:-k)?$/i, '=s160-c');
    next = next.replace(/([?&](?:s|sz|size)=)\d+/gi, '$1160');

    if (/gravatar\.com/i.test(next) && !/[?&](?:s|sz|size)=\d+/i.test(next)) {
      next += (next.includes('?') ? '&' : '?') + 's=160';
    }

    return next;
  }

  /**
   * Check if current user can remove a member
   */
  canRemoveMember(_memberRole: string): boolean {
    return this.currentUserRole() === 'owner';
  }

  protected async inviteFriend(friendUserId: string): Promise<void> {
    const listId = this.resolvedWatchlistId();
    if (!listId) return;

    await this.membersService.inviteFriendToPlaylist(listId, friendUserId);
    this.inviteFeedback.set('Invitation ami prête : brancher ensuite la vraie Edge Function.');
  }

  protected async inviteEmail(email: string): Promise<void> {
    const listId = this.resolvedWatchlistId();
    if (!listId) return;

    await this.membersService.inviteEmailToPlaylist(listId, email);
    this.inviteFeedback.set('Invitation email prête : la vraie logique Supabase viendra ensuite.');
  }

  /**
   * Retry loading members
   */
  retryLoadMembers() {
    this.loadMembers();
  }

  async goBack() {
    const listId = this.resolvedWatchlistId();
    if (this.returnTo() === 'watchlist' && listId) {
      await this.router.navigate(['/watchlist', listId]);
      return;
    }

    await this.watchlistAccess.showSelectionMode();
    await this.router.navigateByUrl('/');
  }
}

