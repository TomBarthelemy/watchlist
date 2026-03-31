import { Component } from '@angular/core';
import { ProfileEditorComponent } from './components/profile-editor/profile-editor.component';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [ProfileEditorComponent],
  templateUrl: './profile-page.component.html',
  styleUrl: './profile-page.component.scss',
})
export class ProfilePageComponent {}