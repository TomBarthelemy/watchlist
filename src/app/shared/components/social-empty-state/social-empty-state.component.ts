import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-social-empty-state',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './social-empty-state.component.html',
  styleUrl: './social-empty-state.component.scss',
})
export class SocialEmptyStateComponent {
  title = input.required<string>();
  message = input.required<string>();
  ctaLabel = input<string | null>(null);
  action = output<void>();
}