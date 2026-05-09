import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { InvitationService } from '@app/features/invitations/services/invitation.service';

@Component({
  selector: 'app-accept-invite-panel',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './accept-invite-panel.component.html',
  styleUrl: './accept-invite-panel.component.scss',
})
export class AcceptInvitePanelComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly invitationService = inject(InvitationService);

  protected readonly preview = this.invitationService.previewInvitationToken(
    this.route.snapshot.queryParamMap.get('token')
  );
}