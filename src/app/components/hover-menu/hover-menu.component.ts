/**
 * A floating hover menu displayed over a chat message.
 * Provides quick actions like reactions, editing, thread opening, and more.
 */

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Message } from '../../models/chat.model';
import { MobileService } from '../../services/mobile.service';

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
  isMobile = false;

  constructor(private mobileService: MobileService) {}

  /**
   * Subscribes to layout changes to determine if mobile layout is active.
   */
  ngOnInit(): void {
    this.mobileService.isMobile$.subscribe((isMobile) => {
      this.isMobile = isMobile;
    });
  }

  /**
   * Toggles the options menu and emits toggle event.
   * @param evt Mouse click event
   */
  onToggleOptions(evt: MouseEvent) {
    evt.stopPropagation();
    this.optionsOpen = !this.optionsOpen;
    this.toggleOptions.emit(evt);
  }

  /**
   * Emits the openEdit event to allow editing the message.
   * @param evt Mouse click event
   */
  onOpenEdit(evt: MouseEvent) {
    evt.stopPropagation();
    this.openEdit.emit(evt);
    this.optionsOpen = false;
  }

  /**
   * Emits the openThread event for threaded message view.
   * @param evt Mouse click event
   */
  onOpenThread(evt: MouseEvent) {
    evt.stopPropagation();
    this.openThread.emit(this.msg);
  }
}
