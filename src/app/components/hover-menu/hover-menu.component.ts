import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Message } from '../../models/chat.model';

@Component({
  selector: 'app-hover-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hover-menu.component.html',
  styleUrl: './hover-menu.component.scss',
})
export class HoverMenuComponent {
  @Input() msg!: Message;
  @Input() currentUserUid!: string | null;
  @Input() showThreadButton = false;
  @Input() showQuickButtons = false;

  @Output() quickReaction = new EventEmitter<string>();
  @Output() togglePicker = new EventEmitter<void>();
  @Output() toggleOptions = new EventEmitter<MouseEvent>();
  @Output() openEdit = new EventEmitter<MouseEvent>();
  @Output() openThread = new EventEmitter<Message>();

  optionsOpen = false;

  onToggleOptions(evt: MouseEvent) {
    evt.stopPropagation();
    this.optionsOpen = !this.optionsOpen;
    this.toggleOptions.emit(evt);
  }

  onOpenEdit(evt: MouseEvent) {
    evt.stopPropagation();
    this.openEdit.emit(evt);
    this.optionsOpen = false;
  }

  onOpenThread(evt: MouseEvent) {
    evt.stopPropagation();
    this.openThread.emit(this.msg);
  }
}
