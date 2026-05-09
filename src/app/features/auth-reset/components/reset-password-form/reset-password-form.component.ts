import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-reset-password-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reset-password-form.component.html',
  styleUrl: './reset-password-form.component.scss',
})
export class ResetPasswordFormComponent {
  protected readonly password = signal('');
  protected readonly confirmPassword = signal('');
  protected readonly feedback = signal<string | null>(null);

  protected submit(): void {
    if (this.password().length < 8) {
      this.feedback.set('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    if (this.password() !== this.confirmPassword()) {
      this.feedback.set('Les deux mots de passe doivent correspondre.');
      return;
    }

    this.feedback.set('Écran prêt : brancher ici le flux Supabase de reset.');
  }
}