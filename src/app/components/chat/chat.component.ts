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
import { ReactionBarComponent } from '../../components/reaction-bar/reaction-bar.component';
import { ChatService } from '../../chat.service';
import { GroupService } from '../../group.service';
import { UserService } from '../../user.service';
import { User } from '../../models/user.model';
import { Observable, Subscription } from 'rxjs';
import { Group } from '../../models/group.model';
import { Message } from '../../models/chat.model';
import { HoverMenuComponent } from '../../components/hover-menu/hover-menu.component';
import { PresenceRecord, PresenceService } from '../../presence.service';
import { ProfileModalComponent } from '../profile-modal/profile-modal.component';
import { NewMessageHeaderComponent } from '../new-message-header/new-message-header.component';
import { GroupHeaderComponent } from '../group-header/group-header.component';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HoverMenuComponent,
    ReactionBarComponent,
    ProfileModalComponent,
    NewMessageHeaderComponent,
    GroupHeaderComponent,
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
  @Input() isNewMessage = false;
  @Output() closedChannel = new EventEmitter<void>();
  @Output() userSelected = new EventEmitter<User>();
  @Output() threadSelected = new EventEmitter<{
    groupId: string;
    messageId: string;
  }>();
  @Output() groupSelected = new EventEmitter<string>();

  group$!: Observable<Group>;
  messages$ = this.chatService.emptyStream;
  chatId: string | null = null;
  newMessage = '';
  messagesLoading = false;
  showEmojiPicker = false;
  showProfileModal = false;

  allGroups: Group[] = [];
  allGroupsMap: Record<string, Group> = {};
  filteredGroups: Group[] = [];
  allUsers: User[] = [];
  allUsersMap: Record<string, User> = {};
  currentParticipants: string[] = [];
  filteredUsers: User[] = [];
  selectedUsers: User[] = [];
  searchTerm = '';

  @ViewChild('grpHeader') grpHeader!: GroupHeaderComponent;

  statusMap: Record<string, boolean> = {};
  private presenceSubs: Subscription[] = [];

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
  @ViewChildren('groupMentionItem', { read: ElementRef })
  groupMentionItems!: QueryList<ElementRef<HTMLLIElement>>;
  showGroupList = false;
  activeGroupIndex = 0;
  private groupMentionStartIndex = 0;

  selectedRecipients: User[] = [];
  selectedGroupRecipients: Group[] = [];

  showSentPopup = false;

  constructor(
    public chatService: ChatService,
    private userService: UserService,
    private groupService: GroupService,
    private presence: PresenceService,
    private sanitizer: DomSanitizer
  ) {
    this.userService.getAllUsersLive().subscribe((users) => {
      this.allUsers = users;
      this.allUsersMap = users.reduce((m, u) => {
        if (u.uid) m[u.uid] = u;
        return m;
      }, {} as Record<string, User>);
      this.presenceSubs.forEach((s) => s.unsubscribe());
      this.presenceSubs = [];
      users.forEach((u) => {
        if (!u.uid) return;
        const sub = this.presence
          .getUserStatus(u.uid)
          .subscribe((rec: PresenceRecord) => {
            this.statusMap[u.uid!] = rec.state === 'online';
          });
        this.presenceSubs.push(sub);
      });
    });

    this.groupService.getAllGroupsLive().subscribe((groups) => {
      this.allGroups = groups;
      this.allGroupsMap = groups.reduce((m, g) => {
        if (g.id) m[g.id] = g;
        return m;
      }, {} as Record<string, Group>);
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

  // diese Methode wird verwendet, um den aktuellen Chat-Partner zu setzen wenn er sich ändert bem der searchbar component
  ngOnInit() {
    this.chatService.currentChatPartner$.subscribe((user) => {
      if (user && this.currentUserUid) {
        this.chatPartner = user;
        this.loadPrivateChat(this.currentUserUid, user);
      }
    });

    this.chatService.currentGroup$.subscribe((group) => {
      if (group) {
        this.chatPartner = null;
        this.groupId = group.id;
        this.loadGroupChat(group.id);
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

  openGroupSettings() {
    if (this.grpHeader) {
      this.grpHeader.toggleGroupSettings();
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
        ...(them.uid !== meUid ? { [them.uid]: them } : {}),
      };
    }

    this.finishLoading();
  }

  private async loadGroupChat(groupId: string) {
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
    const mentions = this.extractMentionIds(text);

    // clear the textarea immediately
    this.newMessage = '';

    let didSend = false;

    // 1) DM selected users
    if (this.selectedRecipients.length) {
      for (const u of this.selectedRecipients) {
        const chatId = await this.chatService.ensureChat(
          this.currentUserUid!,
          u.uid!
        );
        await this.chatService.sendMessage(
          chatId,
          this.currentUserUid!,
          text,
          mentions
        );
      }
      didSend = true;
    }

    // 2) Send to selected groups
    if (this.selectedGroupRecipients.length) {
      for (const g of this.selectedGroupRecipients) {
        await this.chatService.sendGroupMessage(
          g.id!,
          this.currentUserUid!,
          text,
          mentions
        );
      }
      didSend = true;
    }

    // 3) If we just sent to any custom recipients/groups…
    if (didSend) {
      // show popup if in “new message” mode
      if (this.isNewMessage) {
        this.showSentPopup = true;
        setTimeout(() => (this.showSentPopup = false), 3000);
      }
      setTimeout(() => this.scrollToBottom(), 50);
      return;
    }

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

  private extractMentionIds(text: string): string[] {
    const ids = new Set<string>();

    // 1) Users: look for every "@Name" in allUsers
    this.allUsers.forEach((u) => {
      const token = '@' + u.name;
      if (text.includes(token)) ids.add(u.uid!);
    });

    // 2) Groups: look for every "#Name" in allGroups
    this.allGroups.forEach((g) => {
      const token = '#' + g.name;
      if (text.includes(token)) ids.add(g.id!);
    });

    return Array.from(ids);
  }

  formatMessageHtml(msg: Message): SafeHtml {
    let raw = msg.text;

    (msg.mentions || []).forEach((id) => {
      if (this.allUsersMap[id]) {
        const u = this.allUsersMap[id] || this.participantsMap[id];
        const token = '@' + u.name;
        raw = raw.replace(
          new RegExp(this.esc(token)),
          `<span 
            class="mention mention-user cursor-pointer font-bold hover:text-[#444DF2] transition-colors duration-100" 
            data-type="user" 
            data-id="${id}"
          >${token}</span>`
        );
      } else if (this.allGroupsMap[id]) {
        const g = this.allGroupsMap[id];
        const token = '#' + g.name;
        raw = raw.replace(
          new RegExp(this.esc(token)),
          `<span 
            class="mention mention-group cursor-pointer font-bold hover:text-[#444DF2] transition-colors duration-100" 
            data-type="group" 
            data-id="${id}"
          >${token}</span>`
        );
      }
    });

    return this.sanitizer.bypassSecurityTrustHtml(raw);
  }

  async onBubbleClick(evt: MouseEvent) {
    const t = evt.target as HTMLElement;
    if (!t.classList.contains('mention')) return;
    const id = t.getAttribute('data-id')!;
    const type = t.getAttribute('data-type');

    if (type === 'user') {
      let u = this.allUsersMap[id] ?? (await this.userService.getUser(id));
      if (u) {
        this.onMemberClicked(u);
      }
    } else if (type === 'group') {
      this.chatPartner = null;
      const g =
        this.allGroupsMap[id] ??
        (await this.groupService
          .getAllGroups()
          .then((gs) => gs.find((x) => x.id === id)!));
      if (g) {
        this.groupId = g.id;
        this.chatService.setCurrentGroup(g);
        this.groupSelected.emit(g.id);
      }
    }
  }

  onInput() {
    const ta = this.msgInput.nativeElement;
    const val = this.newMessage;
    const pos = ta.selectionStart;
    const hashIdx = val.lastIndexOf('#', pos - 1);
    const atIdx = val.lastIndexOf('@', pos - 1);

    if (hashIdx > atIdx && (hashIdx === 0 || /\s/.test(val[hashIdx - 1]))) {
      // --- GROUP MENTION (#) ---
      const query = val.slice(hashIdx + 1, pos).toLowerCase();
      this.showMentionList = false;
      let pool = this.allGroups;
      if (this.groupId) {
        const parts = this.currentParticipants;
        pool = pool.filter((g) =>
          parts.every((uid) => g.participants?.includes(uid))
        );
      } else if (this.chatPartner && this.currentUserUid) {
        pool = pool.filter(
          (g) =>
            g.participants?.includes(this.currentUserUid!) &&
            g.participants.includes(this.chatPartner!.uid!)
        );
      }
      const matches = pool.filter((g) =>
        g.name.toLowerCase().startsWith(query)
      );
      if (matches.length) {
        this.filteredGroups = matches;
        this.showGroupList = true;
        this.groupMentionStartIndex = hashIdx;
        this.activeGroupIndex = 0;
      } else {
        this.showGroupList = false;
      }
      return;
    }

    if (atIdx > hashIdx && (atIdx === 0 || /\s/.test(val[atIdx - 1]))) {
      // --- USER MENTION (@) ---
      const query = val.slice(atIdx + 1, pos).toLowerCase();
      this.showGroupList = false;
      const pool = this.groupId
        ? Object.values(this.participantsMap)
        : this.allUsers;
      const matches = pool.filter((u) =>
        u.name.toLowerCase().startsWith(query)
      );
      if (matches.length) {
        this.filteredUsers = matches;
        this.showMentionList = true;
        this.mentionStartIndex = atIdx;
        this.activeMentionIndex = 0;
      } else {
        this.showMentionList = false;
      }
      return;
    }

    this.showMentionList = false;
    this.showGroupList = false;
  }

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

  selectGroup(g: Group) {
    const ta = this.msgInput.nativeElement;
    const before = this.newMessage.slice(0, this.groupMentionStartIndex);
    const after = this.newMessage.slice(ta.selectionStart);
    this.newMessage = `${before}#${g.name} ${after}`;
    this.showGroupList = false;
    const newPos = before.length + g.name.length + 2;
    setTimeout(() => {
      ta.setSelectionRange(newPos, newPos);
      ta.focus();
    }, 0);
  }

  startChatWithPartner() {
    if (!this.profileUser) return;
    const userCopy = { ...this.profileUser };
    this.showProfileModal = false;

    setTimeout(() => {
      this.userSelected.emit(userCopy);
      this.profileUser = null;
    }, 10);
  }

  onMemberClicked(user: User) {
    this.profileUser = user;
    this.showProfileModal = true;
  }

  closeProfileModal() {
    this.showProfileModal = false;
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
