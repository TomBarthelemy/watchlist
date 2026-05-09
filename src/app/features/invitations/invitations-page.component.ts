import { Component } from '@angular/core';
import { InvitationsHubComponent } from './components/invitations-hub/invitations-hub.component';

@Component({
  selector: 'app-invitations-page',
  standalone: true,
  imports: [InvitationsHubComponent],
  templateUrl: './invitations-page.component.html',
  styleUrl: './invitations-page.component.scss',
})
export class InvitationsPageComponent {}