import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  NgZone,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';

export type PresenceUser = {
  id: string;
  name: string;
  avatarUrl: string | null;
  isOnline: boolean;
};

@Component({
  selector: 'app-online-presence',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './online-presence.component.html',
  styleUrl: './online-presence.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnlinePresenceComponent implements AfterViewInit {
  users = input.required<PresenceUser[]>();

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  private resizeObserver?: ResizeObserver;

  private readonly availableWidth = signal(0);

  protected readonly others = computed(() => this.users());

  protected readonly visibleUsers = computed(() => {
    const users = this.others();
    const visibleCount = this.visibleCount();
    return users.slice(0, visibleCount);
  });

  protected readonly hiddenCount = computed(() =>
    Math.max(0, this.others().length - this.visibleCount())
  );

  protected readonly ariaLabel = computed(() => {
    const users = this.others();
    const count = users.length;
    const onlineCount = users.filter((u) => u.isOnline).length;

    if (count === 0) {
      return 'Aucun autre membre';
    }

    return `${count} membres, ${onlineCount} en ligne`;
  });

  protected readonly hiddenUsersTooltip = computed(() => {
    const hiddenUsers = this.others().slice(this.visibleCount());
    return hiddenUsers
      .map((user) => `${user.name} (${this.statusLabel(user)})`)
      .join('\n');
  });

  protected statusLabel(user: PresenceUser): string {
    if (user.isOnline) return 'en ligne';
    return 'hors ligne';
  }

  // Avatar chip: fixed 30px + 2px border each side = 34px total, gap 4px, summary badge ~38px
  private static readonly CHIP_SIZE = 34;
  private static readonly GAP = 4;
  private static readonly SUMMARY_WIDTH = 40;

  private readonly visibleCount = computed(() => {
    const totalUsers = this.others().length;

    if (totalUsers <= 1) {
      return totalUsers;
    }

    const width = this.availableWidth();
    if (!width) {
      return Math.min(totalUsers, 4);
    }

    const { CHIP_SIZE, GAP, SUMMARY_WIDTH } = OnlinePresenceComponent;
    const roughSlots = Math.max(1, Math.floor((width + GAP) / (CHIP_SIZE + GAP)));

    if (totalUsers <= roughSlots) {
      return totalUsers;
    }

    // Reserve room for the "+N" summary badge
    const available = width - SUMMARY_WIDTH - GAP;
    return Math.max(1, Math.floor((available + GAP) / (CHIP_SIZE + GAP)));
  });

  ngAfterViewInit() {
    this.measureWidth();

    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    this.resizeObserver = new ResizeObserver(() => {
      this.zone.run(() => this.measureWidth());
    });

    this.resizeObserver.observe(this.host.nativeElement);
    this.destroyRef.onDestroy(() => this.resizeObserver?.disconnect());
  }

  @HostListener('window:resize')
  protected onWindowResize() {
    this.measureWidth();
  }

  protected trackByUserId(_index: number, user: PresenceUser) {
    return user.id;
  }

  protected initials(name: string) {
    return name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || '?';
  }

  /** Deterministic hue from user name (0–360). */
  private nameHue(name: string): number {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
    }
    return hash % 360;
  }

  protected avatarBg(name: string): string {
    const h = this.nameHue(name);
    return `hsl(${h}, 52%, 28%)`;
  }

  protected avatarFg(name: string): string {
    const h = this.nameHue(name);
    return `hsl(${h}, 82%, 88%)`;
  }

  /**
   * Try to request a higher-resolution avatar when provider URL supports size hints.
   * Falls back to original URL when pattern is unknown.
   */
  protected avatarSrc(url: string | null): string | null {
    if (!url) return null;

    let next = url;

    // Google profile photos: ...=s96-c -> ...=s160-c
    next = next.replace(/=s\d+-c(?:-k)?$/i, '=s160-c');

    // Generic query params used by many avatar providers (?s=96, ?sz=96, ?size=96)
    next = next.replace(/([?&](?:s|sz|size)=)\d+/gi, '$1160');

    // Gravatar without explicit size parameter
    if (/gravatar\.com/i.test(next) && !/[?&](?:s|sz|size)=\d+/i.test(next)) {
      next += (next.includes('?') ? '&' : '?') + 's=160';
    }

    return next;
  }

  private measureWidth() {
    this.availableWidth.set(this.host.nativeElement.clientWidth);
  }
}