import { CommonModule } from '@angular/common';
import { Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FriendSummary } from '@app/features/friends/services/friend.service';

@Component({
  selector: 'app-friend-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './friend-selector.component.html',
  styleUrl: './friend-selector.component.scss',
})
export class FriendSelectorComponent {
  friends = input<FriendSummary[]>([]);
  label = input('Inviter un ami');
  placeholder = input('Rechercher un ami par pseudo');
  buttonLabel = input('Inviter');
  submitted = output<string>();

  protected readonly query = signal('');
  protected readonly error = signal<string | null>(null);
  protected readonly options = computed(() => this.friends());
  protected readonly datalistId = `friend-selector-${Math.random().toString(36).slice(2)}`;

  constructor() {
    effect(() => {
      this.friends();
      this.error.set(null);
    });
  }

  protected optionLabel(friend: FriendSummary): string {
    return `${friend.username} (${friend.email})`;
  }

  protected submit(): void {
    const value = this.query().trim().toLowerCase();
    if (!value) {
      this.error.set('Choisis un ami dans la liste.');
      return;
    }

    const selected = this.options().find((friend) => {
      const username = friend.username.toLowerCase();
      const email = friend.email.toLowerCase();
      const label = this.optionLabel(friend).toLowerCase();
      return value === username || value === email || value === label;
    });

    if (!selected) {
      this.error.set('Sélectionne un ami proposé par l’autocomplete.');
      return;
    }

    this.error.set(null);
    this.query.set('');
    this.submitted.emit(selected.id);
  }
}