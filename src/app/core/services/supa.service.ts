import { inject, Injectable, isDevMode, NgZone, signal } from '@angular/core';
import {
  createClient,
  RealtimeChannel,
  RealtimePostgresChangesPayload,
  type User,
} from '@supabase/supabase-js';
import { Category } from '@app/types';
import { Item, OnlineUser, TmdbItemInsert, TmdbItem } from '@app/models';
import { APP_CONFIG } from '@app/app.config';
import { ActiveWatchlistService } from './active-watchlist.service';

@Injectable({ providedIn: 'root' })
export class SupaService {
  private cfg = inject(APP_CONFIG);
  private zone = inject(NgZone);
  private activeWatchlist = inject(ActiveWatchlistService);

  supa = createClient(this.cfg.supaUrl, this.cfg.supaAnon, {
    auth: { persistSession: true, autoRefreshToken: true },
  });

  user = signal<any>(null);
  items = signal<TmdbItem[]>([]);
  loading = signal(false);
  onlineUsers = signal<OnlineUser[]>([]);
  private presenceCh?: RealtimeChannel;
  private channel?: RealtimeChannel;

  constructor() {
    this.supa.auth
      .getUser()
      .then(({ data }) => this.user.set(data.user ?? null));

    this.supa.auth.onAuthStateChange((event, s) => {
      this.zone.run(() => {
        const u = s?.user ?? null;
        if (u) {
          this.user.set(u);
          this.startPresence();
          return;
        }

        // Ignore transient null sessions (can happen on refresh/lock contention).
        // Only clear app state on explicit sign-out-like events.
        if (event === 'SIGNED_OUT') {
          this.user.set(null);
          this.stopPresence();
          this.zone.run(() => this.onlineUsers.set([]));
          this.items.set([]);
          this.channel?.unsubscribe();
          this.channel = undefined;
        }
      });
    });
  }

  async signInWithPassword(email: string, password: string) {
    const { error } = await this.supa.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  }

  async signOut() {
    await this.supa.auth.signOut();
    this.stopPresence();
    this.activeWatchlist.clearActiveListId();
    this.zone.run(() => {
      this.onlineUsers.set([]);
      this.items.set([]);
    });
  }

  refreshSessionUserMetadata(data: Record<string, unknown>) {
    const current = this.user();
    if (!current) return;

    this.zone.run(() => {
      this.user.set({
        ...current,
        user_metadata: {
          ...(current.user_metadata ?? {}),
          ...data,
        },
      });
    });
  }

  async loadItems() {
    const activeListId = this.activeWatchlist.getActiveListId();
    if (!activeListId) {
      this.zone.run(() => {
        this.items.set([]);
        this.loading.set(false);
      });
      this.channel?.unsubscribe();
      this.channel = undefined;
      return;
    }

    this.zone.run(() => this.loading.set(true));
    const { data, error } = await this.supa
      .from('tmdb_item')
      .select('*')
      .eq('list_id', activeListId)
      .order('created_at', { ascending: false });
    if (error) {
      this.zone.run(() => this.loading.set(false));
      throw error;
    }

    this.zone.run(() => {
      this.items.set((data ?? []) as TmdbItem[]);
      this.loading.set(false);
    });

    if (isDevMode()) {
      console.info('[SupaService] loadItems', {
        activeListId,
        itemCount: (data ?? []).length,
      });
    }

    // (Re)subscribe realtime proprement
    this.channel?.unsubscribe();
    this.channel = this.supa
      .channel(`items-${activeListId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tmdb_item',
          filter: `list_id=eq.${activeListId}`,
        },
        (payload: RealtimePostgresChangesPayload<TmdbItem>) => {
          this.zone.run(() => {
            const cur = this.items();
            if (payload.eventType === 'INSERT')
              this.items.set([payload.new!, ...cur]);
            if (payload.eventType === 'UPDATE')
              this.items.set(
                cur.map((i) => (i.id === payload.new!.id ? payload.new! : i))
              );
            if (payload.eventType === 'DELETE')
              this.items.set(cur.filter((i) => i.id !== payload.old!.id));
          });
        }
      )
      .subscribe();
  }

  async addTmdbItem(insertObj: TmdbItemInsert) {
    const activeListId = this.getRequiredActiveListId();

    const { error } = await this.supa.from('tmdb_item').insert({
      list_id: activeListId,

      title: insertObj.title,
      category: insertObj.category,
      genre: insertObj.genre,

      overview: insertObj.overview ?? null,
      poster_path: insertObj.poster_path ?? null,
      year: insertObj.year ?? null,
      trailer_url: insertObj.trailer_url ?? null,

      seen: insertObj.seen,
      seen_at: insertObj.seen_at ?? null,
    });

    if (error) throw error;
  }

  async toggleSeen(item: Item) {
    const activeListId = this.getRequiredActiveListId();
    const seen = !item.seen;
    const seen_at = seen ? new Date().toISOString().slice(0, 10) : null;

    const { error } = await this.supa
      .from('tmdb_item')
      .update({ seen, seen_at })
      .eq('id', item.id)
      .eq('list_id', activeListId);

    if (error) throw error;
  }

  async removeItem(id: string) {
    const activeListId = this.getRequiredActiveListId();
    const before = this.items();

    // 1) Optimiste : retire l’item côté client immédiatement
    this.zone.run(() => {
      this.items.set(before.filter((i) => i.id !== id));
    });

    // 2) Requête réseau
    const { error } = await this.supa
      .from('tmdb_item')
      .delete()
      .eq('id', id)
      .eq('list_id', activeListId);

    // 3) Rollback en cas d’erreur (rare)
    if (error) {
      this.zone.run(() => this.items.set(before));
      throw error;
    }
  }

  // ---------- Presence ----------
  private startPresence() {
    const me = this.user();
    if (!me) return;

    const name: string = me.user_metadata?.display_name;
    const avatar_url: string | null = me.user_metadata?.avatar_url ?? null;

    // (re)create channel
    this.presenceCh?.unsubscribe();
    this.presenceCh = this.supa.channel('presence:watchlist', {
      config: { presence: { key: me.id } },
    });

    // sync presence -> rebuild list
    this.presenceCh.on('presence', { event: 'sync' }, () => {
      const state = this.presenceCh!.presenceState();
      const list: OnlineUser[] = Object.entries(state)
        .map(([id, entries]) => {
          const payload = (entries as any[]).at(-1) ?? {};
          return {
            id,
            name: payload.name ?? 'User',
            isSelf: id === me.id,
            avatarUrl: payload.avatar_url ?? null,
          };
        })
        // self d'abord
        .sort((a, b) =>
          a.isSelf === b.isSelf
            ? a.name.localeCompare(b.name)
            : a.isSelf
            ? -1
            : 1
        );

      this.zone.run(() => this.onlineUsers.set(list));
    });

    // join + publish my presence
    this.presenceCh.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        this.presenceCh!.track({ name, avatar_url });
      }
    });
  }

  private stopPresence() {
    this.presenceCh?.unsubscribe();
    this.presenceCh = undefined;
    this.zone.run(() => this.onlineUsers.set([]));
  }

  async refreshPresenceIdentity(name?: string | null) {
    if (!this.presenceCh) return;

    const current = this.user();
    const presenceName = name ?? current?.user_metadata?.display_name ?? current?.email?.split('@')[0] ?? 'User';
    const avatar_url: string | null = current?.user_metadata?.avatar_url ?? null;

    await this.presenceCh.track({
      name: presenceName,
      avatar_url,
    });
  }

  private getRequiredActiveListId(): string {
    const activeListId = this.activeWatchlist.getActiveListId();
    if (!activeListId) {
      throw new Error('No active watchlist selected');
    }

    return activeListId;
  }
}

