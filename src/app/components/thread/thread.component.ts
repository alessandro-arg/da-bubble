/**
 * ThreadComponent displays a threaded conversation view tied to a specific message within a group chat.
 * It handles loading of original message, thread replies, and allows reactions, editing, and replies to thread messages.
 */

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
import { UserService } from '../../services/user.service';

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
  @ViewChild('threadInputRef')
  private threadInput?: ChatInputComponent;

  editInput?: ElementRef<HTMLTextAreaElement>;

  isMobile = false;
  screenWidth = window.innerWidth;

  constructor(
    private firestore: Firestore,
    public chatService: ChatService,
    private groupService: GroupService,
    private userService: UserService,
    private mobileService: MobileService
  ) {}

  /**
   * Initializes screen size, mobile detection, and group list loading.
   */
  ngOnInit(): void {
    this.mobileService.isMobile$.subscribe((isMobile) => {
      this.isMobile = isMobile;
    });

    this.screenWidth = window.innerWidth;

    this.groupService.getAllGroupsLive().subscribe((groups) => {
      this.allGroups = groups;
    });

    this.userService.getAllUsersLive().subscribe((users) => {
      this.allUsers = users;
      this.participantsMap = Object.fromEntries(users.map((u) => [u.uid!, u]));
    });
  }

  /**
   * Updates screen width on resize.
   */
  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.screenWidth = event.target.innerWidth;
  }

  /**
   * Dynamically loads emoji-picker web component after view init.
   */
  async ngAfterViewInit() {
    if (typeof window !== 'undefined') {
      if (!('requestAnimationFrame' in window)) {
        (window as any).requestAnimationFrame = (cb: FrameRequestCallback) =>
          setTimeout(cb, 0);
      }
      await import('emoji-picker-element');
    }
  }

  /**
   * Reacts to changes in groupId or messageId inputs.
   * Triggers data loading for group, original message and thread messages.
   */
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
      this.focusThreadInput();
    }
  }

  private focusThreadInput() {
    setTimeout(() => {
      this.threadInput?.focusInput();
    }, 0);
  }

  /**
   * Loads all users involved in the current group thread for participant display.
   */
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

  /** Emits closeThread output event to parent */
  onClose() {
    this.closeThread.emit();
  }

  /**
   * Handles click outside of emoji-picker and thread options.
   * Closes pickers or menus accordingly.
   */
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

  /**
   * Scrolls the thread container to the bottom.
   */
  private scrollToBottom() {
    const el = this.threadContainer.nativeElement;
    el.scrollTop = el.scrollHeight;
  }

  /**
   * Sends a new message to the current thread.
   */
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

  /**
   * Handles Enter key to send thread message.
   * @param event KeyboardEvent
   */
  onTextareaKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.altKey) {
      event.preventDefault();
      this.sendThread();
    }
  }

  /** Toggles the emoji picker for thread message input */
  toggleEmojiPicker() {
    this.showEmojiPicker = !this.showEmojiPicker;
  }

  /**
   * Adds selected emoji to thread input.
   * @param event EmojiPicker event
   */
  addEmoji(event: any) {
    this.threadText += event.detail.unicode;
    this.showEmojiPicker = false;
  }

  /**
   * Toggle emoji picker for a specific thread message.
   * @param msgId ID of the message
   */
  toggleMessagePicker(msgId: string) {
    const wasOpen = !!this.messagePicker[msgId];
    this.messagePicker = {};
    if (!wasOpen) {
      this.messagePicker[msgId] = true;
    }
  }

  /**
   * Handles quick emoji reaction click in a thread.
   * @param msg The message object
   * @param emoji Emoji string
   */
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

  /**
   * Begins editing a message within the thread.
   * @param msg Message to edit
   */
  startEdit(msg: Message) {
    this.editingMsgId = msg.id!;
    this.editText = msg.text;
    setTimeout(() => this.editInput?.nativeElement.focus(), 0);
  }

  /** Cancels an active edit state */
  cancelEdit() {
    this.editingMsgId = null;
    this.editText = '';
  }

  /**
   * Saves the edited thread message.
   * @param msg Message to update
   */
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

  /**
   * Toggles the options menu for a message.
   * @param msgId ID of the message
   * @param event Click event
   */
  toggleOptions(msgId: string, event: MouseEvent) {
    event.stopPropagation();
    this.optionsOpen[msgId] = !this.optionsOpen[msgId];
  }

  /**
   * Opens the edit state from the options menu.
   * @param msg Message to edit
   * @param event Click event
   */
  openEditFromOptions(msg: Message, event: MouseEvent) {
    event.stopPropagation();
    this.optionsOpen[msg.id!] = false;
    this.startEdit(msg);
  }
}
