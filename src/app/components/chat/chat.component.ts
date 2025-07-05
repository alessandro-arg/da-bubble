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
import { filter, switchMap, take } from 'rxjs/operators';

import { ChatService } from '../../chat.service';
import { GroupService } from '../../group.service';
import { UserService } from '../../user.service';
import { User } from '../../models/user.model';
import { Observable } from 'rxjs';
import { Group } from '../../models/group.model';
import { Reaction, Message } from '../../models/chat.model';

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
  @Input() groupId!: string | null;
  @Output() userSelected = new EventEmitter<User>();

  group$!: Observable<Group>;
  messages$ = this.chatService.emptyStream;
  chatId: string | null = null;
  newMessage = '';
  messagesLoading = false;
  showEmojiPicker = false;
  showProfileModal = false;

  messagePicker: Record<string, boolean> = {};
  participantsMap: Record<string, User> = {};

  isEmojiHovered = false;
  isAttachHovered = false;

  @ViewChild('emojiBtn', { read: ElementRef }) emojiBtn!: ElementRef;
  @ViewChild('picker', { read: ElementRef }) picker!: ElementRef;
  @ViewChild('chatContainer', { read: ElementRef })
  private chatContainer!: ElementRef<HTMLElement>;

  constructor(
    private chatService: ChatService,
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

  async ngOnChanges(changes: SimpleChanges) {
    this.messagesLoading = true;

    if (changes['chatPartner'] && this.chatPartner && this.currentUserUid) {
      await this.loadPrivateChat(this.currentUserUid, this.chatPartner);
    }

    if (changes['groupId'] && this.groupId) {
      await this.loadGroupChat(this.groupId);
    }
  }

  private async loadPrivateChat(meUid: string, them: User) {
    this.chatId = await this.chatService.ensureChat(meUid, them.uid);
    this.messages$ = this.chatService.getChatMessages(this.chatId);

    const me = await this.userService.getUser(meUid);
    if (!me) {
      console.error(`Could not load current user ${meUid}`);
      this.participantsMap = { [them.uid]: them };
    } else {
      this.participantsMap = {
        [meUid]: me,
        [them.uid]: them,
      };
    }

    this.finishLoading();
  }

  private async loadGroupChat(groupId: string) {
    this.chatId = groupId;
    this.messages$ = this.chatService.getGroupMessages(groupId);

    this.group$ = this.chatService.getGroup(groupId);
    this.group$
      .pipe(
        filter((g) => !!g.creator),
        switchMap((g) => this.userService.getUser(g.creator))
      )
      .subscribe((user) => {
        if (user) this.participantsMap[user.uid!] = user;
      });

    const users = await this.chatService.getGroupParticipants(groupId);
    this.participantsMap = users.reduce(
      (map, u) => ({ ...map, [u.uid!]: u }),
      {} as Record<string, User>
    );

    this.finishLoading();
  }

  private finishLoading() {
    this.messages$.pipe(take(1)).subscribe(() => {
      this.messagesLoading = false;
      setTimeout(() => this.scrollToBottom(), 100);
    });
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
    const el = this.chatContainer.nativeElement;
    el.scrollTop = el.scrollHeight;
  }

  async send() {
    if (!this.newMessage.trim() || !this.currentUserUid) return;
    const text = this.newMessage.trim();

    if (this.groupId) {
      await this.chatService.sendGroupMessage(
        this.groupId,
        this.currentUserUid,
        text
      );
    } else if (this.chatId) {
      await this.chatService.sendMessage(
        this.chatId,
        this.currentUserUid,
        text
      );
    }

    this.newMessage = '';
    setTimeout(() => this.scrollToBottom(), 50);
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

  /**
   * Toggle the emoji‐picker for a single message.
   */
  toggleMessagePicker(msgId: string) {
    Object.keys(this.messagePicker).forEach(
      (id) => (this.messagePicker[id] = false)
    );
    this.messagePicker[msgId] = !this.messagePicker[msgId];
  }

  /**
   * Called when user picks an emoji from the pop‐up.
   */
  async onMessageEmojiSelect(msg: Message, emoji: string) {
    if (!msg.id || !this.currentUserUid) return;

    const reaction: Reaction = {
      emoji,
      userId: this.currentUserUid,
      createdAt: new Date(),
    };

    // use groupId truthiness to decide path
    const isGroup = !!this.groupId;
    const targetId = isGroup ? this.groupId! : this.chatId!;

    await this.chatService.addReaction(targetId, msg.id, reaction, isGroup);

    // immediately close the picker
    this.messagePicker[msg.id] = false;
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
}
