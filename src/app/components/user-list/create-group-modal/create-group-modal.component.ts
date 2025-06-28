import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-create-group-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-group-modal.component.html',
  styleUrl: './create-group-modal.component.scss',
})
export class CreateGroupModalComponent {
  @Output() close = new EventEmitter<void>();
  @Output() created = new EventEmitter<{ name: string; description: string }>();

  name = '';
  description = '';
  step = 1;
  addAll = true;

  stopPropagation(event: MouseEvent) {
    event.stopPropagation();
  }

  onClose() {
    this.reset();
    this.step = 1;
    this.close.emit();
  }

  onCreate() {
    if (!this.name.trim()) {
      return;
    }
    this.created.emit({
      name: this.name.trim(),
      description: this.description.trim(),
    });
    // advance to step 2
    this.step = 2;
    console.log(this.name, 'and', this.description);
  }

  backToStep1() {
    this.step = 1;
  }

  private reset() {
    this.name = '';
    this.description = '';
  }
}
