import { Component } from '@angular/core';
import { AcceptInvitePanelComponent } from './components/accept-invite-panel/accept-invite-panel.component';

@Component({
  selector: 'app-accept-invite-page',
  standalone: true,
  imports: [AcceptInvitePanelComponent],
  templateUrl: './accept-invite-page.component.html',
  styleUrl: './accept-invite-page.component.scss',
})
export class AcceptInvitePageComponent {}