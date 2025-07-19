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
  QueryList,
  ViewChildren,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { shareReplay, take } from 'rxjs/operators';
import { ReactionBarComponent } from '../../reaction-bar/reaction-bar.component';
import { ChatService } from '../../chat.service';
import { GroupService } from '../../group.service';
import { UserService } from '../../user.service';
import { User } from '../../models/user.model';
import { Observable, Subscription } from 'rxjs';
import { Group } from '../../models/group.model';
import { Message } from '../../models/chat.model';
import { MessageSegment } from '../../models/chat.model';
import { HoverMenuComponent } from '../../hover-menu/hover-menu.component';
import { GroupSettingsModalComponent } from '../group-settings-modal/group-settings-modal.component';
import { GroupMembersModalComponent } from '../group-members-modal/group-members-modal.component';
import { AddMembersModalComponent } from '../add-members-modal/add-members-modal.component';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactionBarComponent,
    HoverMenuComponent,
    GroupSettingsModalComponent,
    GroupMembersModalComponent,
    AddMembersModalComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss',
})
export class ChatComponent implements OnChanges, AfterViewInit {
  @Input() chatPartner!: User | null;
  @Input() currentUserUid!: string | null;
  @Input() groupId!: string | null;
  @Input() profileUser: User | null = null;
  @Output() closedChannel = new EventEmitter<void>();
  @Output() userSelected = new EventEmitter<User>();
  @Output() threadSelected = new EventEmitter<{
    groupId: string;
    messageId: string;
  }>();

  group$!: Observable<Group>;
  messages$ = this.chatService.emptyStream;
  chatId: string | null = null;
  newMessage = '';
  messagesLoading = false;
  showEmojiPicker = false;
  showProfileModal = false;
  showAddMembersModal = false;
  showMembersModal = false;
  showGroupSettingsModal = false;

  allUsers: User[] = [];
  allUsersMap: Record<string, User> = {};
  currentParticipants: string[] = [];
  filteredUsers: User[] = [];
  selectedUsers: User[] = [];
  searchTerm = '';

  messagePicker: Record<string, boolean> = {};
  participantsMap: Record<string, User> = {};

  currentGroup: Group | null = null;
  editingGroupName = false;
  editingGroupDescription = false;
  newGroupName = '';
  newGroupDescription = '';

  threadStreams: Record<string, Observable<Message[]>> = {};
  private messagesSub?: Subscription;

  isEmojiHovered = false;
  isAttachHovered = false;
  isAddMembersHovered = false;
  isGroupTitleHovered = false;

  editingMsgId: string | null = null;
  editText = '';
  optionsOpen: Record<string, boolean> = {};

  @ViewChild('emojiBtn', { read: ElementRef }) emojiBtn!: ElementRef;
  @ViewChild('picker', { read: ElementRef }) picker!: ElementRef;
  @ViewChild('chatContainer', { read: ElementRef })
  private chatContainer!: ElementRef<HTMLElement>;

  @ViewChild('editInput', { read: ElementRef })
  editInput?: ElementRef<HTMLTextAreaElement>;

  @ViewChild('messageInput', { read: ElementRef })
  msgInput!: ElementRef<HTMLTextAreaElement>;
  @ViewChildren('mentionItem', { read: ElementRef })
  mentionItems!: QueryList<ElementRef<HTMLLIElement>>;
  showMentionList = false;
  activeMentionIndex = 0;
  private mentionStartIndex = 0;

  constructor(
    public chatService: ChatService,
    private userService: UserService,
    private groupService: GroupService,
    private sanitizer: DomSanitizer
  ) {
    this.userService.getAllUsersLive().subscribe((users) => {
      this.allUsers = users;
      this.allUsersMap = users.reduce((m, u) => {
        if (u.uid) m[u.uid] = u;
        return m;
      }, {} as Record<string, User>);
    });
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

  // diese Methode wird verwendet, um den aktuellen Chat-Partner zu setzen wenn er sich ändert bem der searchbar component  (hamidou)
  ngOnInit() {
    this.chatService.currentChatPartner$.subscribe((user) => {
      if (user && this.currentUserUid) {
        this.chatPartner = user;
        this.loadPrivateChat(this.currentUserUid, user);
      }
    });
  }
  // bis hier

  async ngOnChanges(changes: SimpleChanges) {
    this.messagesLoading = true;

    if (changes['groupId']) {
      if (!this.groupId) {
        this.messagesSub?.unsubscribe();
        this.threadStreams = {};
        this.messages$ = this.chatService.emptyStream;
      }
    }

    if (changes['chatPartner'] && this.chatPartner && this.currentUserUid) {
      await this.loadPrivateChat(this.currentUserUid, this.chatPartner);
    }

    if (changes['groupId'] && this.groupId) {
      await this.loadGroupChat(this.groupId);
    }
  }

  trackById(_idx: number, msg: Message) {
    return msg.id;
  }

  private esc(str: string) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

  private loadGroupChat(groupId: string) {
    this.messagesSub?.unsubscribe();
    this.chatId = groupId;
    this.messages$ = this.chatService.getGroupMessages(groupId);
    this.group$ = this.chatService.getGroup(groupId);
    this.group$.subscribe((g) => {
      this.currentGroup = g;
      this.currentParticipants = g.participants || [];
      const allIds = new Set<string>([g.creator!, ...(g.participants || [])]);
      const missing = Array.from(allIds).filter(
        (uid) => !this.participantsMap[uid]
      );
      if (missing.length) {
        Promise.all(missing.map((uid) => this.userService.getUser(uid))).then(
          (users) => {
            users.forEach((u) => {
              if (u) this.participantsMap[u.uid!] = u;
            });
          }
        );
      }
    });

    this.finishLoading();

    this.messagesSub = this.messages$.pipe(take(1)).subscribe((msgs) => {
      this.threadStreams = {};
      msgs.forEach((m) => {
        if (m.id) {
          this.threadStreams[m.id] = this.chatService
            .getGroupThreadMessages(groupId, m.id)
            .pipe(shareReplay({ bufferSize: 1, refCount: true }));
        }
      });
    });
  }

  get isCreator(): boolean {
    return (
      !!this.currentGroup && this.currentUserUid === this.currentGroup.creator
    );
  }

  private finishLoading() {
    this.messages$.pipe(take(1)).subscribe(() => {
      this.messagesLoading = false;
      setTimeout(() => this.scrollToBottom(), 150);
    });
  }

  startChatWithPartner() {
    if (!this.profileUser) return;
    const userCopy = { ...this.profileUser };
    this.showProfileModal = false;
    this.showMembersModal = false;

    setTimeout(() => {
      this.userSelected.emit(userCopy);
      this.profileUser = null;
    }, 10);
  }

  openThread(msg: Message) {
    if (!this.groupId || !msg.id) return;
    this.threadSelected.emit({
      groupId: this.groupId,
      messageId: msg.id,
    });
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

  async send() {
    if (!this.newMessage.trim() || !this.currentUserUid) return;
    const text = this.newMessage.trim();
    const mentions = this.extractMentionUids(text);
    this.newMessage = '';

    if (this.groupId) {
      await this.chatService.sendGroupMessage(
        this.groupId,
        this.currentUserUid,
        text,
        mentions
      );
    } else if (this.chatId) {
      await this.chatService.sendMessage(
        this.chatId,
        this.currentUserUid,
        text,
        mentions
      );
    }

    setTimeout(() => this.scrollToBottom(), 50);
  }

  private extractMentionUids(text: string): string[] {
    const uids = new Set<string>();

    this.allUsers.forEach((u) => {
      const token = '@' + u.name;
      if (text.includes(token)) {
        uids.add(u.uid!);
      }
    });

    return Array.from(uids);
  }

  formatMessageHtml(msg: Message): SafeHtml {
    let raw = msg.text;
    (msg.mentions || []).forEach((uid) => {
      const user = this.allUsersMap[uid] || this.participantsMap[uid];
      if (!user) return;
      const token = '@' + user.name;
      const re = new RegExp(this.esc(token));
      raw = raw.replace(
        re,
        `<span class="mention cursor-pointer font-bold hover:text-[#444DF2] transition-colors duration-100" data-uid="${uid}">${token}</span>`
      );
    });
    return this.sanitizer.bypassSecurityTrustHtml(raw);
  }

  async onBubbleClick(evt: MouseEvent) {
    const t = evt.target as HTMLElement;
    const uid = t.getAttribute('data-uid');
    if (t.classList.contains('mention') && uid) {
      let user: User | null = this.allUsersMap[uid] ?? null;
      if (!user) {
        user = await this.userService.getUser(uid);
      }
      if (user) {
        this.profileUser = user;
        this.showProfileModal = true;
      }
    }
  }

  onInput() {
    const ta = this.msgInput.nativeElement;
    const val = this.newMessage;
    const pos = ta.selectionStart;
    const idx = val.lastIndexOf('@', pos - 1);
    if (idx >= 0 && (idx === 0 || /\s/.test(val[idx - 1]))) {
      const query = val.slice(idx + 1, pos).toLowerCase();
      const pool = this.groupId
        ? Object.values(this.participantsMap)
        : this.allUsers;

      this.filteredUsers = pool.filter((u) =>
        u.name.toLowerCase().startsWith(query)
      );

      if (this.filteredUsers.length) {
        this.showMentionList = true;
        this.activeMentionIndex = 0;
        this.mentionStartIndex = idx;
        return;
      }
    }
    this.showMentionList = false;
  }

  onTextareaKeydown(e: KeyboardEvent) {
    if (this.showMentionList) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.activeMentionIndex =
          (this.activeMentionIndex + 1) % this.filteredUsers.length;
        this.scrollActiveItemIntoView();
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.activeMentionIndex =
          (this.activeMentionIndex - 1 + this.filteredUsers.length) %
          this.filteredUsers.length;
        this.scrollActiveItemIntoView();
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
      this.send();
    }
  }

  private scrollActiveItemIntoView() {
    const items = this.mentionItems.toArray();
    const el = items[this.activeMentionIndex]?.nativeElement;
    if (el) el.scrollIntoView({ block: 'nearest' });
  }

  triggerMention() {
    const ta = this.msgInput.nativeElement;
    ta.focus();
    const start = ta.selectionStart ?? this.newMessage.length;
    const before = this.newMessage.slice(0, start);
    const after = this.newMessage.slice(start);
    this.newMessage = `${before}@${after}`;
    this.mentionStartIndex = start;
    setTimeout(() => {
      ta.setSelectionRange(start + 1, start + 1);
      this.onInput();
    }, 0);
  }

  onMentionMouseDown(event: MouseEvent, user: User) {
    event.preventDefault();
    this.selectMentionUser(user);
  }

  selectMentionUser(user: User) {
    const ta = this.msgInput.nativeElement;
    const before = this.newMessage.slice(0, this.mentionStartIndex);
    const after = this.newMessage.slice(ta.selectionStart);
    this.newMessage = `${before}@${user.name} ${after}`;
    this.showMentionList = false;

    const newPos = before.length + user.name.length + 2;
    setTimeout(() => {
      ta.setSelectionRange(newPos, newPos);
      ta.focus();
    }, 0);
  }

  onMemberClicked(user: User) {
    this.profileUser = user;
    this.openProfileModal();
  }

  openProfileModal() {
    if (this.chatPartner) {
      this.profileUser = this.chatPartner;
    }
    this.showProfileModal = true;
  }

  closeProfileModal() {
    this.showProfileModal = false;
  }

  onNameClicked(uid: string) {
    const user = this.participantsMap[uid];
    if (user) {
      this.profileUser = {
        uid,
        name: user.name,
        email: user.email || '',
        avatar: user.avatar || '',
      };
      this.showProfileModal = true;
    }
  }

  openAddMembersModal() {
    this.showAddMembersModal = true;
    if (!this.allUsers.length) {
      this.groupService.getAllUsers().then((users) => (this.allUsers = users));
    }
  }

  closeAddMembersModal() {
    this.showAddMembersModal = false;
    this.searchTerm = '';
    this.filteredUsers = [];
  }

  filterUsers() {
    const t = this.searchTerm.trim().toLowerCase();
    if (!t) {
      this.filteredUsers = [];
      return;
    }

    this.filteredUsers = this.allUsers
      .filter((u) => {
        const isCurrent = this.currentParticipants.includes(u.uid!);
        const notSelected = !this.selectedUsers.some((x) => x.uid === u.uid);
        const matchesName = (u.name || u.email || '').toLowerCase().includes(t);
        return !isCurrent && notSelected && matchesName;
      })
      .slice(0, 5);
  }

  selectUser(u: User) {
    if (!this.selectedUsers.find((x) => x.uid === u.uid)) {
      this.selectedUsers.push(u);
    }
    this.searchTerm = '';
    this.filteredUsers = [];
  }

  removeSelected(u: User) {
    this.selectedUsers = this.selectedUsers.filter((x) => x.uid !== u.uid);
  }

  async confirmAdd() {
    if (!this.groupId) return;
    for (let u of this.selectedUsers) {
      await this.groupService.addUserToGroup(this.groupId, u.uid!);
      this.participantsMap[u.uid!] = u;
    }
    this.selectedUsers = [];
    this.closeAddMembersModal();
  }

  openMembersModal() {
    this.showMembersModal = true;
  }

  closeMembersModal() {
    this.showMembersModal = false;
  }

  onClickAddMembersFromMembersModal() {
    this.closeMembersModal();
    this.openAddMembersModal();
  }

  openGroupSettingsModal() {
    this.showGroupSettingsModal = true;
  }

  closeGroupSettingsModal() {
    this.showGroupSettingsModal = false;
  }

  toggleEmojiPicker() {
    this.showEmojiPicker = !this.showEmojiPicker;
  }

  addEmoji(event: any) {
    const ta = this.msgInput.nativeElement;
    this.newMessage += event.detail.unicode;
    this.showEmojiPicker = false;
    ta.focus();
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
    const wasOpen = !!this.messagePicker[msgId];
    this.messagePicker = {};
    if (!wasOpen) {
      this.messagePicker[msgId] = true;
    }
  }

  async onQuickReaction(msg: Message, emoji: string) {
    if (!msg.id || !this.currentUserUid) return;
    const isGroup = !!this.groupId;
    const target = isGroup ? this.groupId! : this.chatId!;
    const already = (msg.reactions ?? []).some(
      (r) => r.userId === this.currentUserUid && r.emoji === emoji
    );

    if (already) {
      await this.chatService.removeReaction(
        target,
        msg.id,
        emoji,
        this.currentUserUid,
        isGroup
      );
    } else {
      await this.chatService.addReaction(
        target,
        msg.id,
        { emoji, userId: this.currentUserUid, createdAt: new Date() },
        isGroup
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
    if (!this.editingMsgId || !this.chatId) return;

    const isGroup = !!this.groupId;
    this.chatService
      .updateMessage(this.chatId, msg.id!, this.editText, isGroup)
      .then(() => {
        this.editingMsgId = null;
        this.editText = '';
      })
      .catch((err) => console.error('Failed to update message', err));
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
