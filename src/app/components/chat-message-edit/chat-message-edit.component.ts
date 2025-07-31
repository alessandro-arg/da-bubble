/**
 * ChatMessageEditComponent allows the user to edit an existing message.
 * Includes support for:
 * - Emoji picker integration
 * - Autosizing textarea
 * - Mobile responsiveness
 * - Event-based communication with parent
 */

import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Message } from '../../models/chat.model';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { MobileService } from '../../services/mobile.service';

@Component({
  selector: 'app-chat-message-edit',
  standalone: true,
  imports: [CommonModule, FormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './chat-message-edit.component.html',
  styleUrl: './chat-message-edit.component.scss',
})
export class ChatMessageEditComponent implements AfterViewInit {
  @Input() msg!: Message;
  @Input() currentUserUid!: string | null;
  @Input() editText = '';
  @Output() editTextChange = new EventEmitter<string>();
  @Output() cancel = new EventEmitter<void>();
  @Output() save = new EventEmitter<void>();

  @ViewChild('editInput') editInput!: ElementRef<HTMLTextAreaElement>;

  showPicker = false;
  isMobile = false;

  constructor(private mobileService: MobileService) {}

  /**
   * Initializes mobile detection via MobileService.
   */
  ngOnInit(): void {
    this.mobileService.isMobile$.subscribe((isMobile) => {
      this.isMobile = isMobile;
    });
  }

  /**
   * Imports the emoji picker and auto-grows the input on component init.
   */
  async ngAfterViewInit() {
    if (typeof window !== 'undefined') {
      await import('emoji-picker-element');
    }
    setTimeout(() => this.autoGrow(), 0);
    this.editInput.nativeElement.focus();
  }

  /**
   * Toggles the visibility of the emoji picker.
   */
  togglePicker() {
    this.showPicker = !this.showPicker;
  }

  /**
   * Handles emoji selection and appends the emoji to the edit text.
   *
   * @param event - Emoji picker event with selected emoji detail
   */
  onEmoji(event: any) {
    this.editText += event.detail.unicode;
    this.editTextChange.emit(this.editText);
    this.showPicker = false;
    this.editInput.nativeElement.focus();
  }

  /**
   * Automatically grows the textarea height based on content.
   * Emits the current edit text after resizing.
   */
  autoGrow() {
    const ta = this.editInput.nativeElement;
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 'px';
    this.editTextChange.emit(this.editText);
  }
}
