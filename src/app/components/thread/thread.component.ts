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
import { UserService } from '../../user.service';
import { serverTimestamp } from '@angular/fire/firestore';
import { GroupService } from '../../group.service';

@Component({
  selector: 'app-thread',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
  expandedReplies = new Set<string>();

  editingMsgId: string | null = null;
  editText = '';
  optionsOpen: Record<string, boolean> = {};

  maxVisible = 9;
  expandedMessages = new Set<string>();

  showEmojiPicker = false;
  isEmojiHovered = false;
  isAttachHovered = false;

  @ViewChild('emojiBtn', { read: ElementRef }) emojiBtn!: ElementRef;
  @ViewChild('picker', { read: ElementRef }) picker!: ElementRef;
  @ViewChild('chatContainer', { read: ElementRef })
  private chatContainer!: ElementRef<HTMLElement>;

  @ViewChild('editInput', { read: ElementRef })
  editInput?: ElementRef<HTMLTextAreaElement>;

  constructor(
    public chatService: ChatService,
    private userService: UserService,
    private groupService: GroupService
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

  ngOnChanges(changes: SimpleChanges) {
    if (this.groupId) {
      this.chatService.getGroupParticipants(this.groupId).then((users) => {
        this.participantsMap = users.reduce(
          (m, u) => ({ ...m, [u.uid!]: u }),
          {} as Record<string, User>
        );
      });
      this.group$ = this.chatService.getGroup(this.groupId);
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
    const el = this.chatContainer.nativeElement;
    el.scrollTop = el.scrollHeight;
  }

  async sendThread() {
    if (
      !this.groupId ||
      !this.messageId ||
      !this.currentUserUid ||
      !this.threadText.trim()
    ) {
      return;
    }
    await this.chatService.sendGroupThreadMessage(
      this.groupId,
      this.messageId,
      this.currentUserUid,
      this.threadText.trim()
    );
    this.threadText = '';
    this.scrollToBottom();
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

  /**
   * Collapse duplicates: [{🙂,a},{🙂,b},{😃,c}] → [{🙂,2},{😃,1}]
   */
  summarizeReactions(
    reactions: Reaction[] = []
  ): { emoji: string; count: number }[] {
    const counter: Record<string, number> = {};
    reactions.forEach((r) => (counter[r.emoji] = (counter[r.emoji] || 0) + 1));
    return Object.entries(counter).map(([emoji, count]) => ({ emoji, count }));
  }

  /**
   * Toggle a reaction: if currentUser has reacted already, remove it;
   * otherwise add it.
   */
  async onReactionClick(msg: Message, emoji: string) {
    if (!this.currentUserUid || !this.groupId || !this.messageId || !msg.id)
      return;

    const already = (msg.reactions || []).some(
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

  getReactionUserNames(msg: Message, emoji: string): string[] {
    return (msg.reactions || [])
      .filter((r) => r.emoji === emoji)
      .map((r) =>
        r.userId === this.currentUserUid
          ? 'You'
          : this.participantsMap[r.userId]?.name || 'Unknown'
      );
  }

  toggleReactions(msgId: string) {
    if (this.expandedMessages.has(msgId)) {
      this.expandedMessages.delete(msgId);
    } else {
      this.expandedMessages.add(msgId);
    }
  }

  isExpanded(msgId: string): boolean {
    return this.expandedMessages.has(msgId);
  }

  extraCount(msg: Message): number {
    const total = this.summarizeReactions(msg.reactions).length;
    return total > this.maxVisible ? total - this.maxVisible : 0;
  }

  displayedReactions(msg: Message) {
    const all = this.summarizeReactions(msg.reactions);
    return this.isExpanded(msg.id!) ? all : all.slice(0, this.maxVisible);
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
