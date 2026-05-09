import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FriendService, FriendSummary } from '../../services/friend.service';
import { SocialEmptyStateComponent } from '@app/shared/components/social-empty-state/social-empty-state.component';

@Component({
  selector: 'app-friends-hub',
  standalone: true,
  imports: [CommonModule, SocialEmptyStateComponent],
  templateUrl: './friends-hub.component.html',
  styleUrl: './friends-hub.component.scss',
})
export class FriendsHubComponent {
  private readonly friendService = inject(FriendService);

  protected readonly friends = signal<FriendSummary[]>([]);
  protected readonly incoming = signal<FriendSummary[]>([]);
  protected readonly outgoing = signal<FriendSummary[]>([]);

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    const [friends, incoming, outgoing] = await Promise.all([
      this.friendService.getFriends(),
      this.friendService.getIncomingRequests(),
      this.friendService.getOutgoingRequests(),
    ]);

    this.friends.set(friends);
    this.incoming.set(incoming);
    this.outgoing.set(outgoing);
  }

  protected trackByFriend(_index: number, friend: FriendSummary): string {
    return friend.id;
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
}