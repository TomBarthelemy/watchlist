import { Injectable, computed, signal } from '@angular/core';

export type FriendStatus = 'accepted' | 'incoming' | 'outgoing';

export interface FriendSummary {
  id: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  status: FriendStatus;
  mutualWatchlists: number;
}

@Injectable({ providedIn: 'root' })
export class FriendService {
  private readonly friendRows = signal<FriendSummary[]>([
    {
      id: 'f-001',
      username: 'Milo',
      email: 'milo@example.com',
      avatarUrl: null,
      status: 'accepted',
      mutualWatchlists: 2,
    },
    {
      id: 'f-002',
      username: 'Sarah',
      email: 'sarah@example.com',
      avatarUrl: null,
      status: 'accepted',
      mutualWatchlists: 1,
    },
    {
      id: 'f-003',
      username: 'Lina',
      email: 'lina@example.com',
      avatarUrl: null,
      status: 'incoming',
      mutualWatchlists: 0,
    },
    {
      id: 'f-004',
      username: 'Noe',
      email: 'noe@example.com',
      avatarUrl: null,
      status: 'outgoing',
      mutualWatchlists: 0,
    },
  ]);

  readonly friends = computed(() =>
    this.friendRows().filter((friend) => friend.status === 'accepted')
  );

  readonly incomingRequests = computed(() =>
    this.friendRows().filter((friend) => friend.status === 'incoming')
  );

  readonly outgoingRequests = computed(() =>
    this.friendRows().filter((friend) => friend.status === 'outgoing')
  );

  getFriends(): Promise<FriendSummary[]> {
    return Promise.resolve(this.friends());
  }

  getIncomingRequests(): Promise<FriendSummary[]> {
    return Promise.resolve(this.incomingRequests());
  }

  getOutgoingRequests(): Promise<FriendSummary[]> {
    return Promise.resolve(this.outgoingRequests());
  }

  async getSelectableFriends(excludedUserIds: string[] = []): Promise<FriendSummary[]> {
    const excluded = new Set(excludedUserIds);
    return this.friends().filter((friend) => !excluded.has(friend.id));
  }
}