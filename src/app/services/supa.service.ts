import { inject, Injectable, NgZone, signal } from '@angular/core';
import {
  createClient,
  RealtimeChannel,
  RealtimePostgresChangesPayload,
  type User,
} from '@supabase/supabase-js';
import { Category } from '../types/item-category.type';
import { Item } from '../models/item.model';
import { OnlineUser } from '../models/online-user.model';
import { APP_CONFIG } from '../app.config';

@Injectable({ providedIn: 'root' })
export class SupaService {
  private cfg = inject(APP_CONFIG);
  private zone = inject(NgZone);

  supa = createClient(this.cfg.supaUrl, this.cfg.supaAnon, {
    auth: { persistSession: true, autoRefreshToken: true },
  });

  user = signal<any>(null);
  items = signal<Item[]>([]);
  loading = signal(false);
  onlineUsers = signal<OnlineUser[]>([]);
  private presenceCh?: RealtimeChannel;
  private channel?: RealtimeChannel;

  constructor() {
    this.supa.auth
      .getUser()
      .then(({ data }) => this.user.set(data.user ?? null));

    this.supa.auth.onAuthStateChange((_e, s) => {
      this.zone.run(() => {
        const u = s?.user ?? null;
        this.user.set(u);
        if (u) {
          this.startPresence();
          this.loadItems();
        } else {
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
    this.zone.run(() => this.onlineUsers.set([]));
  }

  async loadItems() {
    this.zone.run(() => this.loading.set(true));
    const { data, error } = await this.supa
      .from('items')
      .select('*')
      .eq('list_id', this.cfg.listId)
      .order('created_at', { ascending: false });
    if (error) throw error;

    this.zone.run(() => {
      this.items.set((data ?? []) as Item[]);
      this.loading.set(false);
    });

    // (Re)subscribe realtime proprement
    this.channel?.unsubscribe();
    this.channel = this.supa
      .channel(`items-${this.cfg.listId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'items',
          filter: `list_id=eq.${this.cfg.listId}`,
        },
        (payload: RealtimePostgresChangesPayload<Item>) => {
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

  async addItem(partial: {
    title: string;
    category: Category;
    trailer_url?: string;
  }) {
    const { error } = await this.supa.from('items').insert({
      list_id: this.cfg.listId,
      title: partial.title,
      category: partial.category,
      trailer_url: partial.trailer_url ?? null,
    });
    if (error) throw error;
  }

  async toggleSeen(item: Item) {
    const seen = !item.seen;
    const seen_at = seen ? new Date().toISOString().slice(0, 10) : null;

    const { error } = await this.supa
      .from('items')
      .update({ seen, seen_at })
      .eq('id', item.id);

    if (error) throw error;
  }

  async removeItem(id: string) {
    const before = this.items();

    // 1) Optimiste : retire l’item côté client immédiatement
    this.zone.run(() => {
      this.items.set(before.filter((i) => i.id !== id));
    });

    // 2) Requête réseau
    const { error } = await this.supa.from('items').delete().eq('id', id);

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
        this.presenceCh!.track({ name });
      }
    });
  }

  private stopPresence() {
    this.presenceCh?.unsubscribe();
    this.presenceCh = undefined;
    this.zone.run(() => this.onlineUsers.set([]));
  }
}
