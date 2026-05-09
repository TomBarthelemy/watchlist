import { CommonModule } from '@angular/common';
import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-invitation-email-field',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './invitation-email-field.component.html',
  styleUrl: './invitation-email-field.component.scss',
})
export class InvitationEmailFieldComponent {
  label = input('Inviter par email');
  placeholder = input('prenom@example.com');
  buttonLabel = input('Envoyer');
  submitted = output<string>();

  protected readonly email = signal('');
  protected readonly error = signal<string | null>(null);

  protected submit(): void {
    const value = this.email().trim().toLowerCase();
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

    if (!isValid) {
      this.error.set('Renseigne un email valide.');
      return;
    }

    this.error.set(null);
    this.email.set('');
    this.submitted.emit(value);
  }
}