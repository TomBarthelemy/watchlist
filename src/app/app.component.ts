import { Component, effect, inject } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { AuthComponent } from './composants/auth/auth.component';
import { WatchlistComponent } from './composants/watchlist/watchlist.component';
import { SupaService } from './services/supa.service';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, NgIf, AuthComponent, WatchlistComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  theme = inject(ThemeService);

  constructor(public supa: SupaService) {
    // Recharge la liste dès qu’un user est connecté
    effect(
      () => {
        if (this.supa.user()) {
          this.supa.loadItems(); // va écrire dans des signals
        }
      },
      { allowSignalWrites: true }
    );
  }

  signOut() {
    this.supa.signOut();
  }
}
