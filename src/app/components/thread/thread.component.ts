import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
  CUSTOM_ELEMENTS_SCHEMA,
  HostListener,
  AfterViewInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../chat.service';
import { Observable } from 'rxjs';
import { Message, Reaction } from '../../models/chat.model';
import { Group } from '../../models/group.model';
import { User } from '../../models/user.model';
import { ReactionBarComponent } from '../../components/reaction-bar/reaction-bar.component';
import { HoverMenuComponent } from '../../components/hover-menu/hover-menu.component';
import { doc, Firestore, getDoc } from '@angular/fire/firestore';

@Component({
  selector: 'app-thread',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactionBarComponent,
    HoverMenuComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './thread.component.html',
  styleUrl: './thread.component.scss',
})
export class ThreadComponent implements OnChanges, AfterViewInit {
  @Input() groupId!: string | null;
  @Input() messageId!: string | null;
  @Input() currentUserUid!: string | null;
  @Output() closeThread = new EventEmitter<void>();

  originalMessage$?: Observable<Message>;
  threadMessages$?: Observable<Message[]>;
  group$?: Observable<Group>;
  threadText = '';

  participantsMap: Record<string, User> = {};
  messagePicker: Record<string, boolean> = {};

  editingMsgId: string | null = null;
  editText = '';
  optionsOpen: Record<string, boolean> = {};

  showEmojiPicker = false;
  isEmojiHovered = false;
  isAttachHovered = false;

  @ViewChild('emojiBtn', { read: ElementRef }) emojiBtn!: ElementRef;
  @ViewChild('picker', { read: ElementRef }) picker!: ElementRef;
  @ViewChild('threadContainer', { read: ElementRef })
  threadContainer!: ElementRef<HTMLElement>;

  @ViewChild('editInput', { read: ElementRef })
  editInput?: ElementRef<HTMLTextAreaElement>;

  constructor(private firestore: Firestore, public chatService: ChatService) {}

  async ngAfterViewInit() {
    if (typeof window !== 'undefined') {
      if (!('requestAnimationFrame' in window)) {
        (window as any).requestAnimationFrame = (cb: FrameRequestCallback) =>
          setTimeout(cb, 0);
      }
      await import('emoji-picker-element');
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.groupId) {
      this.group$ = this.chatService.getGroup(this.groupId);
      this.loadAllThreadParticipants(this.groupId);
    }

    if (this.groupId && this.messageId) {
      this.originalMessage$ = this.chatService.getGroupMessage(
        this.groupId,
        this.messageId
      );
      this.threadMessages$ = this.chatService.getGroupThreadMessages(
        this.groupId,
        this.messageId
      );
    }
  }

  private async loadAllThreadParticipants(groupId: string) {
    const groupRef = doc(this.firestore, `groups/${groupId}`);
    const groupSnap = await getDoc(groupRef);
    if (!groupSnap.exists()) return;
    const g = groupSnap.data() as Group;

    const allIds = new Set<string>([
      g.creator,
      ...(g.participants || []),
      ...(g.pastParticipants || []),
    ]);

    const usersMap: Record<string, User> = {};
    await Promise.all(
      Array.from(allIds).map(async (uid) => {
        const userRef = doc(this.firestore, `users/${uid}`);
        const userSnap = await getDoc(userRef).catch(() => null);
        if (userSnap?.exists()) {
          const u = { uid: userSnap.id, ...(userSnap.data() as any) };
          usersMap[uid] = u;
        }
      })
    );

    this.participantsMap = usersMap;
  }

  onClose() {
    this.closeThread.emit();
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (target.closest('.emoji-input-container')) return;
    if (target.closest('.picker-container')) return;
    this.showEmojiPicker = false;
    this.messagePicker = {};

    if (!Object.values(this.optionsOpen).some((v) => v)) return;
    if (target.closest('.options-button') || target.closest('.options-popup')) {
      return;
    }

    this.optionsOpen = {};
  }

  private scrollToBottom() {
    const el = this.threadContainer.nativeElement;
    el.scrollTop = el.scrollHeight;
  }

  async sendThread() {
    if (
      !this.threadText.trim() ||
      !this.currentUserUid ||
      !this.groupId ||
      !this.messageId
    ) {
      return;
    }
    const text = this.threadText.trim();
    this.threadText = '';

    await this.chatService.sendGroupThreadMessage(
      this.groupId,
      this.messageId,
      this.currentUserUid,
      text
    );
    setTimeout(() => this.scrollToBottom(), 50);
  }

  onTextareaKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.altKey) {
      event.preventDefault();
      this.sendThread();
    }
  }

  toggleEmojiPicker() {
    this.showEmojiPicker = !this.showEmojiPicker;
  }

  addEmoji(event: any) {
    this.threadText += event.detail.unicode;
    this.showEmojiPicker = false;
  }

  /**
   * Toggle the emoji‐picker for a single message.
   */
  toggleMessagePicker(msgId: string) {
    const wasOpen = !!this.messagePicker[msgId];
    this.messagePicker = {};
    if (!wasOpen) {
      this.messagePicker[msgId] = true;
    }
  }

  async onQuickThreadReaction(msg: Message, emoji: string) {
    if (!msg.id || !this.currentUserUid || !this.groupId || !this.messageId) {
      return;
    }
    const already = (msg.reactions ?? []).some(
      (r) => r.userId === this.currentUserUid && r.emoji === emoji
    );

    if (already) {
      await this.chatService.removeThreadReaction(
        this.groupId,
        this.messageId,
        msg.id,
        emoji,
        this.currentUserUid
      );
    } else {
      const reaction: Reaction = {
        emoji,
        userId: this.currentUserUid,
        createdAt: new Date(),
      };
      await this.chatService.addThreadReaction(
        this.groupId,
        this.messageId,
        msg.id,
        reaction
      );
    }
  }

  startEdit(msg: Message) {
    this.editingMsgId = msg.id!;
    this.editText = msg.text;
    setTimeout(() => this.editInput?.nativeElement.focus(), 0);
  }

  cancelEdit() {
    this.editingMsgId = null;
    this.editText = '';
  }

  saveEdit(msg: Message) {
    if (!this.editingMsgId || !this.groupId || !this.messageId) return;

    this.chatService
      .updateGroupThreadMessage(
        this.groupId,
        this.messageId,
        msg.id!,
        this.editText
      )
      .then(() => {
        this.editingMsgId = null;
        this.editText = '';
      })
      .catch((err) => console.error('Failed to update thread message', err));
  }

  autoGrow(textarea: HTMLTextAreaElement) {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  }

  toggleOptions(msgId: string, event: MouseEvent) {
    event.stopPropagation();
    this.optionsOpen[msgId] = !this.optionsOpen[msgId];
  }

  openEditFromOptions(msg: Message, event: MouseEvent) {
    event.stopPropagation();
    this.optionsOpen[msg.id!] = false;
    this.startEdit(msg);
  }

  addEmojiToEdit(emoji: string) {
    this.editText += emoji;
  }
}
