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
import { ChatInputComponent } from '../chat-input/chat-input.component';
import { PrivateChatEmptyComponent } from '../private-chat-empty/private-chat-empty.component';
import { DateSeparatorComponent } from '../date-separator/date-separator.component';
import { GroupChatEmptyComponent } from '../group-chat-empty/group-chat-empty.component';
import { ChatMessageEditComponent } from '../chat-message-edit/chat-message-edit.component';
import { PrivateMessageBubbleComponent } from '../private-message-bubble/private-message-bubble.component';
import { GroupMessageBubbleComponent } from '../group-message-bubble/group-message-bubble.component';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ProfileModalComponent,
    NewMessageHeaderComponent,
    ChatInputComponent,
    GroupHeaderComponent,
    PrivateChatEmptyComponent,
    DateSeparatorComponent,
    GroupChatEmptyComponent,
    ChatMessageEditComponent,
    PrivateMessageBubbleComponent,
    GroupMessageBubbleComponent,
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
  showProfileModal = false;

  allGroups: Group[] = [];
  allGroupsMap: Record<string, Group> = {};
  filteredGroups: Group[] = [];
  allUsers: User[] = [];
  allUsersMap: Record<string, User> = {};
  currentParticipants: string[] = [];
  filteredUsers: User[] = [];

  statusMap: Record<string, boolean> = {};
  private presenceSubs: Subscription[] = [];
  participantsMap: Record<string, User> = {};

  currentGroup: Group | null = null;
  editingGroupName = false;
  editingGroupDescription = false;
  newGroupName = '';
  newGroupDescription = '';

  threadStreams: Record<string, Observable<Message[]>> = {};
  private messagesSub?: Subscription;

  editingMsgId: string | null = null;
  editText = '';
  optionsOpen: Record<string, boolean> = {};

  @ViewChild('grpHeader') grpHeader!: GroupHeaderComponent;
  @ViewChild('chatContainer', { read: ElementRef })
  private chatContainer!: ElementRef<HTMLElement>;

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
