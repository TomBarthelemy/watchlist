import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { InvitationService, PlaylistInvitation } from '../../services/invitation.service';
import { SocialEmptyStateComponent } from '@app/shared/components/social-empty-state/social-empty-state.component';

@Component({
  selector: 'app-invitations-hub',
  standalone: true,
  imports: [CommonModule, SocialEmptyStateComponent],
  templateUrl: './invitations-hub.component.html',
  styleUrl: './invitations-hub.component.scss',
})
export class InvitationsHubComponent {
  private readonly invitationService = inject(InvitationService);

  protected readonly received = signal<PlaylistInvitation[]>([]);
  protected readonly sent = signal<PlaylistInvitation[]>([]);

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    const [received, sent] = await Promise.all([
      this.invitationService.getReceivedInvitations(),
      this.invitationService.getSentInvitations(),
    ]);

    this.received.set(received);
    this.sent.set(sent);
  }

  protected trackByInvitation(_index: number, invitation: PlaylistInvitation): string {
    return invitation.id;
  }

  protected formatDate(value: string): string {
    return new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  }
}