/**
 * ChatInputComponent provides a rich message input field for composing and sending messages.
 * Features include:
 * - Emoji picker integration
 * - Inline @mention and #group autocompletion
 * - Dynamic placeholder based on context
 * - Keyboard navigation for suggestion lists
 * - Responsive layout for mobile/desktop
 */

import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ViewChildren,
  ElementRef,
  QueryList,
  AfterViewInit,
  HostListener,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { User } from '../../models/user.model';
import { Group } from '../../models/group.model';
import { MobileService } from '../../services/mobile.service';
@Component({
  selector: 'app-chat-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './chat-input.component.html',
  styleUrl: './chat-input.component.scss',
})
export class ChatInputComponent implements AfterViewInit {
  @Input() newMessage = '';
  @Output() newMessageChange = new EventEmitter<string>();

  @Input() chatPartner!: User | null;
  @Input() currentUserUid!: string | null;
  @Input() groupId!: string | null;
  @Input() isNewMessage = false;
  @Input() allUsers: User[] = [];
  @Input() allGroups: Group[] = [];
  @Input() participantsMap: Record<string, User> = {};
  @Input() statusMap: Record<string, boolean> = {};
  @Input() currentGroup: Group | null = null;
  @Input() showSentPopup = false;
  @Output() sendPressed = new EventEmitter<void>();

  showMentionList = false;
  showGroupList = false;
  filteredUsers: User[] = [];
  filteredGroups: Group[] = [];
  activeMentionIndex = 0;
  activeGroupIndex = 0;
  mentionStartIndex = 0;
  groupMentionStartIndex = 0;

  isMobile = false;
  showEmojiPicker = false;
  isEmojiHovered = false;
  isAttachHovered = false;
  messagePicker: Record<string, boolean> = {};

  @ViewChild('messageInput', { read: ElementRef })
  msgInput!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('emojiBtn', { read: ElementRef })
  emojiBtn!: ElementRef;
  @ViewChild('picker', { read: ElementRef })
  picker!: ElementRef;

  @ViewChildren('mentionItem', { read: ElementRef })
  mentionItems!: QueryList<ElementRef<HTMLLIElement>>;
  @ViewChildren('groupMentionItem', { read: ElementRef })
  groupMentionItems!: QueryList<ElementRef<HTMLLIElement>>;

  constructor(private mobileService: MobileService) {}

  /**
   * Initializes mobile responsiveness based on viewport size.
   */
  ngOnInit(): void {
    this.mobileService.isMobile$.subscribe((isMobile) => {
      this.isMobile = isMobile;
    });
  }

  /**
   * Dynamically imports the emoji picker on init.
   */
  async ngAfterViewInit() {
    if (typeof window !== 'undefined') {
      await import('emoji-picker-element');
    }
  }

  /**
   * Emits updated message content on input change.
   */
  onTextChange() {
    this.newMessageChange.emit(this.newMessage);
  }

  /**
   * Emits when the user presses the send button.
   */
  onSendClick() {
    this.sendPressed.emit();
  }

  /**
   * Detects if the user is typing a mention (`@`) or group (`#`) and shows autocomplete.
   */
  onInput() {
    const ta = this.msgInput.nativeElement;
    const val = this.newMessage;
    const pos = ta.selectionStart ?? val.length;
    const hashIdx = val.lastIndexOf('#', pos - 1);
    const atIdx = val.lastIndexOf('@', pos - 1);

    if (hashIdx > atIdx && (hashIdx === 0 || /\s/.test(val[hashIdx - 1]))) {
      const q = val.slice(hashIdx + 1, pos).toLowerCase();
      let pool = this.allGroups;
      if (this.groupId) {
        const parts = this.participantsMap;
        pool = pool.filter((g) => g.participants?.every((uid) => parts[uid]));
      } else if (this.chatPartner && this.currentUserUid) {
        pool = pool.filter(
          (g) =>
            g.participants?.includes(this.currentUserUid!) &&
            g.participants.includes(this.chatPartner!.uid!)
        );
      }
      this.filteredGroups = pool.filter((g) =>
        g.name.toLowerCase().startsWith(q)
      );
      this.showGroupList = this.filteredGroups.length > 0;
      this.groupMentionStartIndex = hashIdx;
      this.showMentionList = false;
      return;
    }

    if (atIdx > hashIdx && (atIdx === 0 || /\s/.test(val[atIdx - 1]))) {
      const q = val.slice(atIdx + 1, pos).toLowerCase();
      const pool = this.groupId
        ? Object.values(this.participantsMap)
        : this.allUsers;
      this.filteredUsers = pool.filter((u) =>
        u.name.toLowerCase().startsWith(q)
      );
      this.showMentionList = this.filteredUsers.length > 0;
      this.mentionStartIndex = atIdx;
      this.showGroupList = false;
      return;
    }
    this.showMentionList = this.showGroupList = false;
  }

  /**
   * Handles keyboard interactions within the textarea (arrows, tab, enter).
   */
  onTextareaKeydown(e: KeyboardEvent) {
    if (this.showGroupList) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.activeGroupIndex =
          (this.activeGroupIndex + 1) % this.filteredGroups.length;
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.activeGroupIndex =
          (this.activeGroupIndex - 1 + this.filteredGroups.length) %
          this.filteredGroups.length;
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        this.selectGroup(this.filteredGroups[this.activeGroupIndex]);
        return;
      }
    }

    if (this.showMentionList) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.activeMentionIndex =
          (this.activeMentionIndex + 1) % this.filteredUsers.length;
        this.scrollMentionIntoView();
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.activeMentionIndex =
          (this.activeMentionIndex - 1 + this.filteredUsers.length) %
          this.filteredUsers.length;
        this.scrollMentionIntoView();
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        this.selectMentionUser(this.filteredUsers[this.activeMentionIndex]);
        return;
      }
    }

    if (e.key === 'Enter' && !e.altKey) {
      e.preventDefault();
      this.onSendClick();
    }
  }

  /**
   * Scrolls the currently active mention item into view.
   */
  private scrollMentionIntoView() {
    const items = this.mentionItems.toArray();
    items[this.activeMentionIndex]?.nativeElement.scrollIntoView({
      block: 'nearest',
    });
  }

  /**
   * Inserts the selected user mention into the message.
   */
  selectMentionUser(u: User) {
    const ta = this.msgInput.nativeElement;
    const before = this.newMessage.slice(0, this.mentionStartIndex);
    const after = this.newMessage.slice(ta.selectionStart!);
    this.newMessage = `${before}@${u.name} ${after}`;
    this.onTextChange();
    this.showMentionList = false;
    const newPos = before.length + u.name.length + 2;
    setTimeout(() => {
      ta.setSelectionRange(newPos, newPos);
      ta.focus();
    }, 0);
  }

  /**
   * Inserts the selected group mention into the message.
   */
  selectGroup(g: Group) {
    const ta = this.msgInput.nativeElement;
    const before = this.newMessage.slice(0, this.groupMentionStartIndex);
    const after = this.newMessage.slice(ta.selectionStart!);
    this.newMessage = `${before}#${g.name} ${after}`;
    this.onTextChange();
    this.showGroupList = false;
    const newPos = before.length + g.name.length + 2;
    setTimeout(() => {
      ta.setSelectionRange(newPos, newPos);
      ta.focus();
    }, 0);
  }

  /**
   * Manually triggers user mention at the cursor position.
   */
  triggerMention() {
    const ta = this.msgInput.nativeElement;
    ta.focus();
    const start = ta.selectionStart ?? this.newMessage.length;
    this.newMessage =
      this.newMessage.slice(0, start) + '@' + this.newMessage.slice(start);
    this.onTextChange();
    setTimeout(() => {
      ta.setSelectionRange(start + 1, start + 1);
      this.onInput();
    }, 0);
  }

  /**
   * Toggles the emoji picker visibility.
   */
  toggleEmojiPicker() {
    this.showEmojiPicker = !this.showEmojiPicker;
  }

  /**
   * Inserts selected emoji into the message.
   */
  addEmoji(evt: any) {
    this.newMessage += evt.detail.unicode;
    this.onTextChange();
    this.showEmojiPicker = false;
    this.msgInput.nativeElement.focus();
  }

  /**
   * Closes dropdowns and pickers when clicking outside.
   */
  @HostListener('document:click', ['$event'])
  onClickOutside(evt: MouseEvent) {
    const tgt = evt.target as HTMLElement;
    if (
      tgt.closest('.emoji-input-container') ||
      tgt.closest('.picker-container')
    )
      return;
    this.showEmojiPicker = false;
    this.messagePicker = {};
    if (this.showMentionList || this.showGroupList) {
      if (!tgt.closest('.mention-list') && !tgt.closest('.picker-container')) {
        this.showMentionList = this.showGroupList = false;
      }
    }
  }

  /**
   * Dynamic placeholder text based on chat context.
   */
  get placeholderText(): string {
    if (this.isNewMessage) {
      return 'Starte eine neue Nachricht';
    }
    if (this.chatPartner) {
      return `Nachricht an ${this.chatPartner.name}`;
    }
    if (this.currentGroup) {
      return `Nachricht an #${this.currentGroup.name}`;
    }
    return '';
  }
}
