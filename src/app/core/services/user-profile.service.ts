import { Injectable, computed, inject, signal } from '@angular/core';
import { APP_CONFIG } from '@app/app.config';
import { UserProfile } from '@app/models';
import { SupaService } from './supa.service';

type UserProfileRow = {
  id: string;
  email: string | null;
  username: string | null;
  avatar_url: string | null;
};

@Injectable({ providedIn: 'root' })
export class UserProfileService {
  private readonly supaService = inject(SupaService);
  private readonly cfg = inject(APP_CONFIG);
  private readonly avatarBucket = this.cfg.avatarBucket ?? 'avatars';
  readonly syncWarning = signal<string | null>(null);

  readonly profile = signal<UserProfile | null>(null);
  readonly loading = signal(false);
  readonly initials = computed(() => {
    const username = this.profile()?.username ?? this.supaService.user()?.email ?? '';
    const parts: string[] = username.trim().split(/\s+/).filter((part: string) => part.length > 0);

    return parts.slice(0, 2).map((part: string) => part[0]?.toUpperCase() ?? '').join('') || 'U';
  });

  async loadCurrentProfile(force = false): Promise<UserProfile | null> {
    const authUser = this.supaService.user();
    if (!authUser) {
      this.profile.set(null);
      return null;
    }

    if (!force && this.profile()?.id === authUser.id) {
      return this.profile();
    }

    this.loading.set(true);
    try {
      const { data, error } = await this.supaService.supa
        .from('users')
        .select('id, email, username, avatar_url')
        .eq('id', authUser.id)
        .maybeSingle<UserProfileRow>();

      if (error) {
        throw error;
      }

      const fallbackProfile = this.buildFallbackProfile();
      const profile = data
        ? {
            id: data.id,
            email: data.email ?? fallbackProfile.email,
            username: data.username ?? fallbackProfile.username,
            avatarUrl: data.avatar_url ?? fallbackProfile.avatarUrl,
          }
        : fallbackProfile;

      this.profile.set(profile);
      return profile;
    } finally {
      this.loading.set(false);
    }
  }

  async updateProfile(input: { username: string; avatarFile?: File | null; avatarUrl?: string | null }) {
    const authUser = this.supaService.user();
    if (!authUser) {
      throw new Error('Utilisateur non connecte.');
    }

    const username = input.username.trim();
    if (username.length < 2 || username.length > 40) {
      throw new Error('Le pseudo doit contenir entre 2 et 40 caracteres.');
    }

    let avatarUrl = input.avatarUrl ?? this.profile()?.avatarUrl ?? null;
    if (input.avatarFile) {
      avatarUrl = await this.uploadAvatar(input.avatarFile);
    }

    const nextProfile: UserProfile = {
      id: authUser.id,
      email: authUser.email ?? this.profile()?.email ?? '',
      username,
      avatarUrl,
    };

    const { error: updateAuthError } = await this.supaService.supa.auth.updateUser({
      data: {
        display_name: username,
        avatar_url: avatarUrl,
      },
    });

    if (updateAuthError) {
      throw updateAuthError;
    }

    await this.syncUsersTable(nextProfile);

    this.profile.set(nextProfile);
    this.supaService.refreshSessionUserMetadata({
      display_name: nextProfile.username,
      avatar_url: nextProfile.avatarUrl,
    });
    await this.supaService.refreshPresenceIdentity(nextProfile.username);

    return nextProfile;
  }

  private async syncUsersTable(profile: UserProfile) {
    this.syncWarning.set(null);

    const payload = {
      email: profile.email,
      username: profile.username,
      avatar_url: profile.avatarUrl,
      updated_at: new Date().toISOString(),
    };

    const { data: updatedRows, error: updateError } = await this.supaService.supa
      .from('users')
      .update(payload)
      .eq('id', profile.id)
      .select('id');

    if (updateError) {
      this.syncWarning.set(
        `Le profil Auth est enregistre, mais la table users n'a pas pu etre synchronisee (${updateError.message}).`
      );
      return;
    }

    if ((updatedRows ?? []).length > 0) {
      return;
    }

    const { error: insertError } = await this.supaService.supa
      .from('users')
      .insert({
        id: profile.id,
        ...payload,
      });

    if (insertError) {
      this.syncWarning.set(
        `Le profil Auth est enregistre, mais la creation du profil public a echoue (${insertError.message}).`
      );
    }
  }

  private async uploadAvatar(file: File) {
    const authUser = this.supaService.user();
    if (!authUser) {
      throw new Error('Utilisateur non connecte.');
    }

    const extension = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    const path = `${authUser.id}/avatar-${Date.now()}.${extension}`;
    const { error } = await this.supaService.supa.storage
      .from(this.avatarBucket)
      .upload(path, file, { upsert: true, contentType: file.type || 'image/jpeg' });

    if (error) {
      const details = [error.message, error.name].filter(Boolean).join(' - ');
      throw new Error(
        `Impossible d'envoyer l'image de profil (bucket: ${this.avatarBucket}). ` +
        `Cause Supabase: ${details || 'inconnue'}. ` +
        `Verifie le bucket et les policies Storage (insert/select).`
      );
    }

    const { data } = this.supaService.supa.storage.from(this.avatarBucket).getPublicUrl(path);
    return data.publicUrl;
  }

  private buildFallbackProfile(): UserProfile {
    const authUser = this.supaService.user();

    return {
      id: authUser?.id ?? '',
      email: authUser?.email ?? '',
      username:
        authUser?.user_metadata?.display_name ??
        authUser?.user_metadata?.username ??
        authUser?.email?.split('@')[0] ??
        'Utilisateur',
      avatarUrl: authUser?.user_metadata?.avatar_url ?? null,
    };
  }
}