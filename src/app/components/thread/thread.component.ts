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
  OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../services/chat.service';
import { Observable } from 'rxjs';
import { Message, Reaction } from '../../models/chat.model';
import { Group } from '../../models/group.model';
import { User } from '../../models/user.model';
import { ReactionBarComponent } from '../../components/reaction-bar/reaction-bar.component';
import { HoverMenuComponent } from '../../components/hover-menu/hover-menu.component';
import { doc, Firestore, getDoc } from '@angular/fire/firestore';
import { MobileService } from '../../services/mobile.service';
import { ChatInputComponent } from '../chat-input/chat-input.component';
import { GroupService } from '../../services/group.service';
import { ChatMessageEditComponent } from '../chat-message-edit/chat-message-edit.component';

@Component({
  selector: 'app-thread',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactionBarComponent,
    HoverMenuComponent,
    ChatInputComponent,
    ChatMessageEditComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './thread.component.html',
  styleUrl: './thread.component.scss',
})
export class ThreadComponent implements OnChanges, AfterViewInit, OnInit {
  @Input() groupId!: string | null;
  @Input() messageId!: string | null;
  @Input() currentUserUid!: string | null;
  @Output() closeThread = new EventEmitter<void>();

  originalMessage$?: Observable<Message>;
  threadMessages$?: Observable<Message[]>;
  group$?: Observable<Group>;
  threadText = '';

  allUsers: User[] = [];
  allGroups: Group[] = [];
  currentGroup: Group | null = null;
  statusMap: Record<string, boolean> = {};

  participantsMap: Record<string, User> = {};
  messagePicker: Record<string, boolean> = {};

  editingMsgId: string | null = null;
  editText = '';
  optionsOpen: Record<string, boolean> = {};

  showEmojiPicker = false;
  isEmojiHovered = false;
  isAttachHovered = false;

  @ViewChild('threadContainer', { read: ElementRef })
  threadContainer!: ElementRef<HTMLElement>;

  editInput?: ElementRef<HTMLTextAreaElement>;

  isMobile = false;
  screenWidth = window.innerWidth;

  constructor(
    private firestore: Firestore,
    public chatService: ChatService,
    private groupService: GroupService,
    private mobileService: MobileService
  ) {}

  ngOnInit(): void {
    this.mobileService.isMobile$.subscribe((isMobile) => {
      this.isMobile = isMobile;
    });

    this.screenWidth = window.innerWidth;

    this.groupService.getAllGroupsLive().subscribe((groups) => {
      this.allGroups = groups;
    });
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.screenWidth = event.target.innerWidth;
  }

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
      this.group$.subscribe((group) => {
        this.currentGroup = group;
      });
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

  toggleOptions(msgId: string, event: MouseEvent) {
    event.stopPropagation();
    this.optionsOpen[msgId] = !this.optionsOpen[msgId];
  }

  openEditFromOptions(msg: Message, event: MouseEvent) {
    event.stopPropagation();
    this.optionsOpen[msg.id!] = false;
    this.startEdit(msg);
  }
}
