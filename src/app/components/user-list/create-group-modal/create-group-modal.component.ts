import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-create-group-modal',
  standalone: true,
  imports: [],
  templateUrl: './create-group-modal.component.html',
  styleUrl: './create-group-modal.component.scss',
})
export class CreateGroupModalComponent {
  @Output() close = new EventEmitter<void>();

  stopPropagation(event: MouseEvent) {
    event.stopPropagation();
  }
}
