import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { AuthComponent } from './composants/auth/auth.component';
import { SupaService } from './services/supa.service';
import { ThemeService } from './services/theme.service';

/**
 * AppComponent
 *
 * Root application shell that orchestrates high-level layout and structure.
 *
 * Responsibilities:
 * - Application header (branding, theme toggle, user presence, logout)
 * - Authentication state routing (auth form vs. router outlet)
 * - High-level layout container
 * - Router outlet for authenticated pages/routes
 *
 * Delegates all other logic to specialized services and page components:
 * - AuthComponent: authentication flow
 * - Routed pages: watchlist access, main view, members, settings
 * - Services: state management, data fetching, theme
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, AuthComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  theme = inject(ThemeService);
  supa = inject(SupaService);

  signOut() {
    this.supa.signOut();
  }
}
