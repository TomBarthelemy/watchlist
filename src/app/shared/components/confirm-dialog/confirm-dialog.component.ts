import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.scss',
})
export class ConfirmDialogComponent {
  @Input({ required: true }) open = false;
  @Input() title = 'Confirmer l\'action';
  @Input() message = 'Cette action est irreversible.';
  @Input() confirmLabel = 'Confirmer';
  @Input() cancelLabel = 'Annuler';

  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  onOverlayClick() {
    this.cancelled.emit();
  }

  onCancel() {
    this.cancelled.emit();
  }

  onConfirm() {
    this.confirmed.emit();
  }
}
