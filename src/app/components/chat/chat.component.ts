/**
 * ChatComponent is the main UI component for displaying and interacting with both
 * private and group chats. It handles:
 * - Loading and displaying messages
 * - Tracking user presence and typing
 * - Mention formatting
 * - Reactions, threads, editing, and group navigation
 * - Mobile support and responsive behavior
 */

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
  OnInit,
  HostListener,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { shareReplay, skip, take } from 'rxjs/operators';
import { ChatService } from '../../services/chat.service';
import { GroupService } from '../../services/group.service';
import { UserService } from '../../services/user.service';
import { User } from '../../models/user.model';
import { Observable, Subscription } from 'rxjs';
import { Group } from '../../models/group.model';
import { Message } from '../../models/chat.model';
import {
  PresenceRecord,
  PresenceService,
} from '../../services/presence.service';
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
import { MessageUtilsService } from '../../services/message-utils.service';
import { MobileService } from '../../services/mobile.service';

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
export class ChatComponent implements OnChanges, OnInit, OnDestroy {
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

  public get participantsMap(): Record<string, User> {
    return this.allUsersMap;
  }
  currentGroup: Group | null = null;

  threadStreams: Record<string, Observable<Message[]>> = {};
  private messagesSub?: Subscription;
  private scrollSub?: Subscription;

  editingMsgId: string | null = null;
  editText = '';
  optionsOpen: Record<string, boolean> = {};

  @ViewChild('grpHeader') grpHeader!: GroupHeaderComponent;
  @ViewChild('chatContainer', { read: ElementRef })
  private chatContainer!: ElementRef<HTMLElement>;

  selectedRecipients: User[] = [];
  selectedGroupRecipients: Group[] = [];

  showSentPopup = false;
  isMobile = false;
  screenWidth = window.innerWidth;

  constructor(
    public chatService: ChatService,
    private userService: UserService,
    private groupService: GroupService,
    private presence: PresenceService,
    public msgUtils: MessageUtilsService,
    private mobileService: MobileService
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

  /**
   * Initializes mobile view detection.
   */
  ngOnInit(): void {
    this.mobileService.isMobile$.subscribe((isMobile) => {
      this.isMobile = isMobile;
    });

    this.screenWidth = window.innerWidth;
  }

  /**
   * Updates screen width on window resize.
   */
  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.screenWidth = event.target.innerWidth;
  }

  /**
   * Responds to input changes (e.g., group or user selection).
   */
  async ngOnChanges(changes: SimpleChanges) {
    this.messagesLoading = true;

    if (changes['groupId']) {
      if (!this.groupId) {
        this.messagesSub?.unsubscribe();
        this.scrollSub?.unsubscribe();
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

  ngOnDestroy() {
    this.messagesSub?.unsubscribe();
    this.scrollSub?.unsubscribe();
    this.presenceSubs.forEach((s) => s.unsubscribe());
  }

  /**
   * TrackBy function for ngFor performance in message rendering.
   */
  trackById(_idx: number, msg: Message) {
    return msg.id;
  }

  /**
   * Formats a message using mention highlighting.
   */
  public formatMessage = (msg: Message) =>
    this.msgUtils.formatMessageHtml(
      msg,
      this.allUsersMap,
      this.allGroupsMap,
      this.participantsMap
    );

  /**
   * Opens the group settings modal from the header component.
   */
  openGroupSettings() {
    if (this.grpHeader) {
      this.grpHeader.toggleGroupSettings();
    }
  }

  /**
   * Loads messages and metadata for a private chat.
   */
  private async loadPrivateChat(meUid: string, them: User) {
    this.chatId = await this.chatService.ensureChat(meUid, them.uid!);
    this.messages$ = this.chatService.getChatMessages(this.chatId);
    this.scrollSub?.unsubscribe();
    this.scrollSub = this.messages$
      .pipe(skip(1))
      .subscribe(() => setTimeout(() => this.scrollToBottom(), 50));
    this.finishLoading();
  }

  /**
   * Loads messages and thread streams for a group chat.
   */
  private async loadGroupChat(groupId: string) {
    this.messagesSub?.unsubscribe();
    this.scrollSub?.unsubscribe();
    this.chatId = groupId;
    this.messages$ = this.chatService.getGroupMessages(groupId);
    this.scrollSub = this.messages$
      .pipe(skip(1))
      .subscribe(() => setTimeout(() => this.scrollToBottom(), 50));
    this.group$ = this.chatService.getGroup(groupId);
    this.subscribeToGroup();
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

  /**
   * Subscribes to the current group observable (`group$`) and updates the component's
   * state with the retrieved group object. After receiving the group data, it checks
   * for any missing participants in the local map and triggers fetching them.
   */
  private subscribeToGroup() {
    this.group$.subscribe((g) => {
      this.currentGroup = g;
      this.fetchMissingParticipants(g);
    });
  }

  /**
   * Checks for participants (including the group's creator) that are not yet loaded
   * into `participantsMap` and fetches their user data from the user service.
   * Once fetched, the missing participants are added to the local map.
   * @param group - The group object containing the creator and participant UIDs.
   */
  private fetchMissingParticipants(group: Group) {
    const allIds = new Set([group.creator!, ...(group.participants || [])]);
    const missing = Array.from(allIds).filter(
      (uid) => !this.participantsMap[uid]
    );

    if (missing.length) {
      Promise.all(missing.map((uid) => this.userService.getUser(uid))).then(
        (users) =>
          users.forEach((u) => {
            if (u) this.participantsMap[u.uid!] = u;
          })
      );
    }
  }

  /**
   * Whether the current user is the creator of the group.
   */
  get isCreator(): boolean {
    return (
      !!this.currentGroup && this.currentUserUid === this.currentGroup.creator
    );
  }

  /**
   * Finalizes message loading and scrolls to bottom.
   */
  private finishLoading() {
    this.messages$.pipe(take(1)).subscribe(() => {
      this.messagesLoading = false;
      setTimeout(() => this.scrollToBottom(), 150);
    });
  }

  /**
   * Emits event to open a thread for the given group message.
   */
  openThread(msg: Message) {
    if (!this.groupId || !msg.id) return;
    this.threadSelected.emit({
      groupId: this.groupId,
      messageId: msg.id,
    });
  }

  /**
   * Scrolls the chat view to the bottom.
   */
  private scrollToBottom() {
    const el = this.chatContainer.nativeElement;
    el.scrollTop = el.scrollHeight;
  }

  /**
   * Handles sending a message to selected users, selected groups, or the currently active chat/group.
   * It determines the message recipients, extracts mentions from the message,
   * and dispatches the message to the appropriate chat(s).
   * Shows a confirmation popup if the message was sent as a new message.
   */
  async send() {
    if (!this.newMessage.trim() || !this.currentUserUid) return;

    const text = this.newMessage.trim();
    const mentions = this.msgUtils.extractMentionIds(
      text,
      this.allUsers,
      this.allGroups
    );
    this.newMessage = '';

    const didSendToUsers = await this.sendToSelectedRecipients(text, mentions);
    const didSendToGroups = await this.sendToSelectedGroupRecipients(
      text,
      mentions
    );

    const didSend = didSendToUsers || didSendToGroups;

    if (!didSend) {
      await this.sendToActiveChatOrGroup(text, mentions);
    }

    if (didSend && this.isNewMessage) {
      this.showSentConfirmation();
    }

    setTimeout(() => this.scrollToBottom(), 50);
  }

  /**
   * Sends a direct message to each user in the `selectedRecipients` list.
   * Ensures a chat exists between the current user and each recipient before sending the message.
   * @param text - The message content to send.
   * @param mentions - List of user or group IDs mentioned in the message.
   * @returns A promise that resolves to `true` if at least one message was sent; otherwise `false`.
   */
  private async sendToSelectedRecipients(
    text: string,
    mentions: string[]
  ): Promise<boolean> {
    let didSend = false;
    for (const u of this.selectedRecipients) {
      const cid = await this.chatService.ensureChat(
        this.currentUserUid!,
        u.uid!
      );
      await this.chatService.sendMessage(
        cid,
        this.currentUserUid!,
        text,
        mentions
      );
      didSend = true;
    }
    return didSend;
  }

  /**
   * Sends a message to each group in the `selectedGroupRecipients` list.
   * @param text - The message content to send.
   * @param mentions - List of user or group IDs mentioned in the message.
   * @returns A promise that resolves to `true` if at least one group message was sent; otherwise `false`.
   */
  private async sendToSelectedGroupRecipients(
    text: string,
    mentions: string[]
  ): Promise<boolean> {
    let didSend = false;
    for (const g of this.selectedGroupRecipients) {
      await this.chatService.sendGroupMessage(
        g.id!,
        this.currentUserUid!,
        text,
        mentions
      );
      didSend = true;
    }
    return didSend;
  }

  /**
   * Sends a message to the currently active chat or group if no specific recipients were selected.
   * Falls back to `groupId` or `chatId` based on context.
   * @param text - The message content to send.
   * @param mentions - List of user or group IDs mentioned in the message.
   */
  private async sendToActiveChatOrGroup(text: string, mentions: string[]) {
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

  /**
   * Displays a temporary confirmation popup indicating that a new message was successfully sent.
   * Automatically hides the popup after 3 seconds.
   */
  private showSentConfirmation() {
    this.showSentPopup = true;
    setTimeout(() => (this.showSentPopup = false), 3000);
  }

  /**
   * Handles click on a message bubble (e.g., mentions).
   */
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

  /**
   * Starts a chat with the selected profile user.
   */
  startChatWithPartner() {
    if (!this.profileUser) return;
    const userCopy = { ...this.profileUser };
    this.showProfileModal = false;

    setTimeout(() => {
      this.userSelected.emit(userCopy);
      this.profileUser = null;
    }, 10);
  }

  /**
   * Opens the profile modal for a given user.
   */
  onMemberClicked(user: User) {
    this.profileUser = user;
    this.showProfileModal = true;
  }

  /**
   * Closes the profile modal.
   */
  closeProfileModal() {
    this.showProfileModal = false;
  }

  /**
   * Toggles a quick emoji reaction on a message.
   */
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

  /**
   * Starts editing the selected message.
   */
  startEdit(msg: Message) {
    this.editingMsgId = msg.id!;
    this.editText = msg.text;
  }

  /**
   * Cancels message editing.
   */
  cancelEdit() {
    this.editingMsgId = null;
    this.editText = '';
  }

  /**
   * Saves edited message content.
   */
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

  /**
   * Toggles visibility of the message options menu.
   */
  toggleOptions(msgId: string, event: MouseEvent) {
    event.stopPropagation();
    this.optionsOpen[msgId] = !this.optionsOpen[msgId];
  }

  /**
   * Opens the edit interface from the options menu.
   */
  openEditFromOptions(msg: Message, event: MouseEvent) {
    event.stopPropagation();
    this.optionsOpen[msg.id!] = false;
    this.startEdit(msg);
  }
}
