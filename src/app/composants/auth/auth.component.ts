import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SupaService } from '../../services/supa.service';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.scss'],
})
export class AuthComponent {
  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  busy = signal(false);
  showPw = signal(false);

  constructor(private fb: FormBuilder, public supa: SupaService) {}

  async onLogin() {
    if (this.form.invalid) return;
    this.busy.set(true);
    try {
      const { email, password } = this.form.getRawValue();
      await this.supa.signInWithPassword(email!, password!);
    } finally {
      this.busy.set(false);
    }
  }

  togglePw() {
    this.showPw.update((v) => !v);
  }
}
