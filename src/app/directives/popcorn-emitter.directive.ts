import {
  Directive,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';

@Directive({
  selector: '[popcornEmitter]',
  standalone: true,
})
export class PopcornEmitterDirective implements OnInit, OnDestroy {
  // DÉBIT / CAP
  @Input() rate = 0.35; // grains / seconde (moyenne)
  @Input() max = 24; // nombre max simultané

  // TAILLE
  @Input() minSize = 24; // px
  @Input() maxSize = 42; // px

  // HAUTEUR DE VOL (jusqu’où ça monte)
  @Input() minHeightVh = 55; // en vh
  @Input() maxHeightVh = 85; // en vh

  // DÉPORT HORIZONTAL (drift latéral aléatoire)
  @Input() spreadX = 220; // px max gauche/droite

  // ROTATION
  @Input() minSpin = 180; // degrés
  @Input() maxSpin = 540; // degrés

  // DURÉE (aléatoire pour varier le “pop”)
  @Input() minDuration = 1600; // ms
  @Input() maxDuration = 3200; // ms

  // OPACITÉ (apparition/disparition douce)
  @Input() fadeInAt = 0.12; // offset
  @Input() fadeOutAt = 0.85; // offset

  @Input() bounceMin = 14; // px – small rebound on the bed
  @Input() bounceMax = 26; // px
  @Input() settleHold = 220; // ms – micro “linger” before fading (added to duration)

  private host = inject(ElementRef<HTMLElement>).nativeElement;
  private rafId = 0;
  private lastTs = 0;
  private carry = 0; // accumulateur “poisson”
  private active = 0;
  private running = true;

  ngOnInit() {
    // S’assure que le host est overlay correctement
    this.host.classList.add('popcorn-overlay');
    this.loop = this.loop.bind(this);
    this.rafId = requestAnimationFrame(this.loop);
  }

  ngOnDestroy() {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  private loop(ts: number) {
    if (!this.running) return;

    const dt = (ts - (this.lastTs || ts)) / 1000; // s
    this.lastTs = ts;

    // Poisson simplifié : on accumule la “masse” attendue et on spawn quand >=1
    // in loop()
    this.carry += dt * this.rate * (0.7 + Math.random() * 0.6); // 0.7x–1.3x jitter

    while (this.carry > 1 && this.active < this.max) {
      this.carry -= 1;
      this.spawn();
    }

    this.rafId = requestAnimationFrame(this.loop);
  }

  private spawn() {
    const w = this.host.clientWidth || window.innerWidth;
    const h = this.host.clientHeight || window.innerHeight;

    // Position de départ (bas de l’écran)
    const x0 = Math.random() * w;
    const y0 = h + 8; // très légèrement en-dessous

    // Taille & échelle
    const size = this.rand(this.minSize, this.maxSize);

    // Hauteur de vol en pixels
    const heightVh = this.rand(this.minHeightVh, this.maxHeightVh);
    const dy = (heightVh / 100) * h;

    // Déport horizontal aléatoire (gauche ou droite)
    const dx =
      (Math.random() < 0.5 ? -1 : 1) *
      this.rand(this.spreadX * 0.35, this.spreadX);

    // Spin
    const spin =
      (Math.random() < 0.5 ? -1 : 1) * this.rand(this.minSpin, this.maxSpin);
    // small rebound height
    const bounce = this.rand(this.bounceMin, this.bounceMax);

    // Duration (we add a tiny "linger" so grains are visible on the bed)
    const duration = this.rand(this.minDuration, this.maxDuration) + this.settleHold;

    // Élément DOM
    const node = document.createElement('div');
    node.className = 'popcorn-grain';
    node.style.setProperty('--sz', `${size}px`);
    node.style.left = `${x0}px`;
    node.style.bottom = `-${size + 4}px`; // start sous l’écran
    this.host.appendChild(node);
    this.active++;

const kf: Keyframe[] = [
  // launch from the bottom
  { transform: `translate(0,0) rotate(0)`, opacity: 0 },

  // fast ascent with slight drift & spin – feels like a "pop"
  {
    offset: 0.30,
    transform: `translate(${dx * 0.35}px, -${dy * 0.62}px) rotate(${spin * 0.55}deg)`,
    opacity: 1,
  },

  // fall back almost to the floor/bed (−8px keeps it just above)
  {
    offset: 0.68,
    transform: `translate(${dx * 0.95}px, -8px) rotate(${spin}deg)`,
    opacity: 1,
  },

  // little bounce
  {
    offset: 0.82,
    transform: `translate(${dx}px, -${bounce}px) rotate(${spin}deg)`,
    opacity: 1,
  },

  // settle on the bed
  {
    offset: 0.94,
    transform: `translate(${dx}px, -6px) rotate(${spin}deg)`,
    opacity: 1,
  },

  // “merge” into the bed (fade)
  {
    offset: 1,
    transform: `translate(${dx}px, -6px) rotate(${spin}deg)`,
    opacity: 0,
  },
];

const anim = node.animate(kf, {
  duration,
  easing: 'cubic-bezier(.18,.9,.18,1)', // snappy pop & bounce
  fill: 'forwards',
});

    anim.onfinish = anim.oncancel = () => {
      node.remove();
      this.active--;
    };
  }

  private rand(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }
}
