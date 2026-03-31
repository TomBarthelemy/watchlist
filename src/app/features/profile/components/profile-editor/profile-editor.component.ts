import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { UserProfileService } from '@app/core/services/user-profile.service';

@Component({
  selector: 'app-profile-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile-editor.component.html',
  styleUrls: ['./profile-editor.component.scss'],
})
export class ProfileEditorComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  protected readonly profileService = inject(UserProfileService);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly success = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly warning = signal<string | null>(null);
  protected readonly previewUrl = signal<string | null>(null);
  protected readonly selectedFile = signal<File | null>(null);
  protected readonly initials = computed(() => this.profileService.initials());
  protected readonly currentAvatarUrl = computed(
    () => this.previewUrl() ?? this.profileService.profile()?.avatarUrl ?? null
  );

  readonly form = this.fb.group({
    username: this.fb.nonNullable.control('', [
      Validators.required,
      Validators.minLength(2),
      Validators.maxLength(40),
    ]),
  });

  async ngOnInit() {
    await this.loadProfile();
  }

  async goBack() {
    await this.router.navigateByUrl('/watchlists');
  }

  onAvatarSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.error.set('Selectionne une image valide.');
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      this.error.set('L image doit faire moins de 3 Mo.');
      return;
    }

    this.error.set(null);
    this.selectedFile.set(file);
    this.previewUrl.set(URL.createObjectURL(file));
  }

  clearSelectedAvatar() {
    this.selectedFile.set(null);
    this.previewUrl.set(null);
  }

  async save() {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    this.warning.set(null);
    this.success.set(null);

    try {
      await this.profileService.updateProfile({
        username: this.form.controls.username.getRawValue(),
        avatarFile: this.selectedFile(),
      });
      this.selectedFile.set(null);
      this.previewUrl.set(null);
      this.success.set('Profil mis a jour.');
      this.warning.set(this.profileService.syncWarning());
      await this.loadProfile(false);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Erreur de mise a jour du profil.');
    } finally {
      this.saving.set(false);
    }
  }

  private async loadProfile(showLoader = true) {
    if (showLoader) this.loading.set(true);

    try {
      const profile = await this.profileService.loadCurrentProfile(true);
      this.form.patchValue({ username: profile?.username ?? '' }, { emitEvent: false });
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Erreur de chargement du profil.');
    } finally {
      if (showLoader) this.loading.set(false);
    }
  }
}