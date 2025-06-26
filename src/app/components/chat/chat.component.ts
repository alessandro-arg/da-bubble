import {
  Component,
  OnChanges,
  SimpleChanges,
  Input,
  ViewChild,
  ElementRef,
  AfterViewInit,
  HostListener,
  CUSTOM_ELEMENTS_SCHEMA,
  Output,
  EventEmitter,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { take, tap } from 'rxjs/operators';

import { ChatService } from '../../chat.service';
import { UserService } from '../../user.service';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss',
})
export class ChatComponent implements OnChanges, AfterViewInit {
  @Input() chatPartner!: User | null;
  @Input() currentUserUid!: string | null;

  @Output() userSelected = new EventEmitter<User>();

  messages$ = this.chatService.emptyStream;
  chatId: string | null = null;
  newMessage = '';
  messagesLoading = false;
  showEmojiPicker = false;
  showProfileModal = false;

  isEmojiHovered = false;
  isAttachHovered = false;

  participantsMap: Record<string, User> = {};

  @ViewChild('emojiBtn', { read: ElementRef }) emojiBtn!: ElementRef;
  @ViewChild('picker', { read: ElementRef }) picker!: ElementRef;
  @ViewChild('chatContainer', { read: ElementRef })
  private chatContainer!: ElementRef<HTMLElement>;

  constructor(
    private chatService: ChatService,
    private userService: UserService
  ) {}

  async ngAfterViewInit() {
    if (typeof window !== 'undefined') {
      if (!('requestAnimationFrame' in window)) {
        (window as any).requestAnimationFrame = (cb: FrameRequestCallback) =>
          setTimeout(cb, 0);
      }
      await import('emoji-picker-element');
    }
  }

  async ngOnChanges(changes: SimpleChanges) {
    if (changes['chatPartner'] && this.chatPartner && this.currentUserUid) {
      this.messagesLoading = true;
      this.chatId = await this.chatService.ensureChat(
        this.currentUserUid,
        this.chatPartner.uid
      );
      this.messages$ = this.chatService.getChatMessages(this.chatId).pipe(
        take(1),
        tap(() => (this.messagesLoading = false))
      );

      const me = await this.userService.getUser(this.currentUserUid);
      if (me) {
        this.participantsMap = {
          [me.uid!]: me,
          [this.chatPartner.uid]: this.chatPartner,
        };
      }

      this.messages$
        .pipe(take(1))
        .subscribe(() => setTimeout(() => this.scrollToBottom(), 0));
    }
  }

  startChatWithPartner() {
    if (this.chatPartner) {
      this.userSelected.emit(this.chatPartner);
      this.closeProfileModal();
    }
  }

  openProfileModal() {
    this.showProfileModal = true;
  }

  closeProfileModal() {
    this.showProfileModal = false;
  }

  toggleEmojiPicker() {
    this.showEmojiPicker = !this.showEmojiPicker;
  }

  addEmoji(event: any) {
    this.newMessage += event.detail.unicode;
    this.showEmojiPicker = false;
  }

  @HostListener('document:click', ['$event.target'])
  onClickOutside(target: HTMLElement) {
    if (
      this.showEmojiPicker &&
      !this.emojiBtn.nativeElement.contains(target) &&
      !this.picker?.nativeElement.contains(target)
    ) {
      this.showEmojiPicker = false;
    }
  }

  private scrollToBottom() {
    const c = this.chatContainer.nativeElement;
    c.scrollTop = c.scrollHeight;
  }

  async send() {
    if (!this.chatId || !this.newMessage.trim() || !this.currentUserUid) return;
    await this.chatService.sendMessage(
      this.chatId,
      this.currentUserUid,
      this.newMessage.trim()
    );
    this.newMessage = '';
    setTimeout(() => this.scrollToBottom(), 0);
  }

  onTextareaKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.altKey) {
      event.preventDefault();
      this.send();
    }
  }

  sameDay(d1: Date, d2: Date): boolean {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  }

  getSeparatorLabel(d: Date): string {
    const today = new Date();
    const diffMs = today.getTime() - d.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (this.sameDay(d, today)) {
      return 'Heute';
    } else if (diffDays < 7) {
      return d.toLocaleDateString('de-DE', { weekday: 'long' });
    } else {
      return d.toLocaleDateString('de-DE');
    }
  }
}
