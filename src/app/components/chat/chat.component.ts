import {
  Component,
  OnChanges,
  SimpleChanges,
  Input,
  ViewChild,
  ElementRef,
  CUSTOM_ELEMENTS_SCHEMA,
  Output,
  EventEmitter,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { shareReplay, take } from 'rxjs/operators';
import { ChatService } from '../../chat.service';
import { GroupService } from '../../group.service';
import { UserService } from '../../user.service';
import { User } from '../../models/user.model';
import { Observable, Subscription } from 'rxjs';
import { Group } from '../../models/group.model';
import { Message } from '../../models/chat.model';
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
import { MessageUtilsService } from '../../message-utils.service';

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
export class ChatComponent implements OnChanges {
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
  allUsers: User[] = [];
  allUsersMap: Record<string, User> = {};
  statusMap: Record<string, boolean> = {};
  private presenceSubs: Subscription[] = [];

  participantsMap: Record<string, User> = {};
  currentGroup: Group | null = null;

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
    private sanitizer: DomSanitizer,
    public msgUtils: MessageUtilsService
  ) {
    this.userService.getAllUsersLive().subscribe((users) => {
      this.allUsers = users;
      this.allUsersMap = Object.fromEntries(users.map((u) => [u.uid!, u]));
      this.presenceSubs.forEach((s) => s.unsubscribe());
      this.presenceSubs = users
        .filter((u) => u.uid)
        .map((u) =>
          this.presence
            .getUserStatus(u.uid!)
            .subscribe((rec: PresenceRecord) => {
              this.statusMap[u.uid!] = rec.state === 'online';
            })
        );
    });

    this.groupService.getAllGroupsLive().subscribe((groups) => {
      this.allGroups = groups;
      this.allGroupsMap = Object.fromEntries(groups.map((g) => [g.id!, g]));
    });
  }

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

  public formatMessage = (msg: Message) =>
    this.msgUtils.formatMessageHtml(
      msg,
      this.allUsersMap,
      this.allGroupsMap,
      this.participantsMap
    );

  openGroupSettings() {
    if (this.grpHeader) {
      this.grpHeader.toggleGroupSettings();
    }
  }

  private async loadPrivateChat(meUid: string, them: User) {
    this.chatId = await this.chatService.ensureChat(meUid, them.uid!);
    this.messages$ = this.chatService.getChatMessages(this.chatId);
    const me = await this.userService.getUser(meUid);
    this.participantsMap = me
      ? { [meUid]: me, ...(them.uid !== meUid && { [them.uid!]: them }) }
      : { [them.uid!]: them };
    this.finishLoading();
  }

  private async loadGroupChat(groupId: string) {
    this.messagesSub?.unsubscribe();
    this.chatId = groupId;
    this.messages$ = this.chatService.getGroupMessages(groupId);
    this.group$ = this.chatService.getGroup(groupId);
    this.group$.subscribe((g) => {
      this.currentGroup = g;
      const allIds = new Set([g.creator!, ...(g.participants || [])]);
      const missing = Array.from(allIds).filter(
        (uid) => !this.participantsMap[uid]
      );
      if (missing.length) {
        Promise.all(missing.map((uid) => this.userService.getUser(uid))).then(
          (users) =>
            users.forEach((u) => u && (this.participantsMap[u.uid!] = u))
        );
      }
    });
    this.finishLoading();
    this.messagesSub = this.messages$.pipe(take(1)).subscribe((msgs) => {
      this.threadStreams = Object.fromEntries(
        msgs
          .filter((m) => m.id)
          .map((m) => [
            m.id!,
            this.chatService
              .getGroupThreadMessages(groupId, m.id!)
              .pipe(shareReplay({ bufferSize: 1, refCount: true })),
          ])
      );
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

  private scrollToBottom() {
    const el = this.chatContainer.nativeElement;
    el.scrollTop = el.scrollHeight;
  }

  async send() {
    if (!this.newMessage.trim() || !this.currentUserUid) return;
    const text = this.newMessage.trim();
    const mentions = this.msgUtils.extractMentionIds(
      text,
      this.allUsers,
      this.allGroups
    );
    this.newMessage = '';
    let didSend = false;

    for (const u of this.selectedRecipients) {
      const cid = await this.chatService.ensureChat(
        this.currentUserUid,
        u.uid!
      );
      await this.chatService.sendMessage(
        cid,
        this.currentUserUid,
        text,
        mentions
      );
      didSend = true;
    }
    if (!didSend) {
      for (const g of this.selectedGroupRecipients) {
        await this.chatService.sendGroupMessage(
          g.id!,
          this.currentUserUid!,
          text,
          mentions
        );
        didSend = true;
      }
    }
    if (didSend && this.isNewMessage) {
      this.showSentPopup = true;
      setTimeout(() => (this.showSentPopup = false), 3000);
    }
    if (!didSend) {
      if (this.groupId) {
        await this.chatService.sendGroupMessage(
          this.groupId,
          this.currentUserUid!,
          text,
          mentions
        );
      } else if (this.chatId) {
        await this.chatService.sendMessage(
          this.chatId,
          this.currentUserUid!,
          text,
          mentions
        );
      }
    }
    setTimeout(() => this.scrollToBottom(), 50);
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
