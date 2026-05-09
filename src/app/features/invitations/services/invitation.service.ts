import { Injectable, computed, signal } from '@angular/core';

export type InvitationDirection = 'received' | 'sent';
export type InvitationTargetType = 'user' | 'email';
export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired';

export interface PlaylistInvitation {
  id: string;
  listId: string;
  listName: string;
  inviterName: string;
  inviteeLabel: string;
  targetType: InvitationTargetType;
  direction: InvitationDirection;
  status: InvitationStatus;
  role: 'editor';
  createdAt: string;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class InvitationService {
  private readonly invitations = signal<PlaylistInvitation[]>([
    {
      id: 'inv-001',
      listId: 'wl-001',
      listName: 'Films du dimanche',
      inviterName: 'Tom',
      inviteeLabel: 'Sarah',
      targetType: 'user',
      direction: 'sent',
      status: 'pending',
      role: 'editor',
      createdAt: '2026-04-01T09:30:00.000Z',
      message: 'On complete la liste ensemble ?',
    },
    {
      id: 'inv-002',
      listId: 'wl-002',
      listName: 'Anime backlog',
      inviterName: 'Milo',
      inviteeLabel: 'tom@example.com',
      targetType: 'email',
      direction: 'received',
      status: 'pending',
      role: 'editor',
      createdAt: '2026-03-31T18:10:00.000Z',
    },
  ]);

  readonly received = computed(() =>
    this.invitations().filter((invitation) => invitation.direction === 'received')
  );

  readonly sent = computed(() =>
    this.invitations().filter((invitation) => invitation.direction === 'sent')
  );

  getReceivedInvitations(): Promise<PlaylistInvitation[]> {
    return Promise.resolve(this.received());
  }

  getSentInvitations(): Promise<PlaylistInvitation[]> {
    return Promise.resolve(this.sent());
  }

  previewInvitationToken(token: string | null) {
    if (!token) {
      return null;
    }

    return {
      token,
      listName: 'Films du dimanche',
      inviterName: 'Tom',
      role: 'editor' as const,
    };
  }
}