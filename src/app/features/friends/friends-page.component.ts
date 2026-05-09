import { Component } from '@angular/core';
import { FriendsHubComponent } from './components/friends-hub/friends-hub.component';

@Component({
  selector: 'app-friends-page',
  standalone: true,
  imports: [FriendsHubComponent],
  templateUrl: './friends-page.component.html',
  styleUrl: './friends-page.component.scss',
})
export class FriendsPageComponent {}