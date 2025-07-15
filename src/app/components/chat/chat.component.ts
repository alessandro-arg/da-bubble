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
import { filter, shareReplay, switchMap, take } from 'rxjs/operators';
import { ReactionBarComponent } from '../../reaction-bar/reaction-bar.component';
import { ChatService } from '../../chat.service';
import { GroupService } from '../../group.service';
import { UserService } from '../../user.service';
import { User } from '../../models/user.model';
import { forkJoin, Observable, Subscription } from 'rxjs';
import { Group } from '../../models/group.model';
import { Reaction, Message } from '../../models/chat.model';
import { HoverMenuComponent } from '../../hover-menu/hover-menu.component';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactionBarComponent,
    HoverMenuComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss',
})
export class ChatComponent implements OnChanges, AfterViewInit {
  @Input() chatPartner!: User | null;
  @Input() currentUserUid!: string | null;
  @Input() groupId!: string | null;
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
    this.messagesSub?.unsubscribe();
    this.chatId = groupId;
    this.messages$ = this.chatService.getGroupMessages(groupId);
    this.group$ = this.chatService.getGroup(groupId);
    this.group$.pipe(take(1)).subscribe((g) => {
      this.currentGroup = g;
      this.currentParticipants = g.participants || [];
    });

    this.group$
      .pipe(
        filter((g) => !!g.creator),
        take(1)
      )
      .subscribe((g) => {
        const allIds = new Set<string>([
          g.creator!,
          ...(g.participants || []),
          ...(g.pastParticipants || []),
        ]);

        Promise.all(
          Array.from(allIds).map((uid) => this.userService.getUser(uid))
        ).then((users) => {
          this.participantsMap = users
            .filter((u): u is User => !!u)
            .reduce((map, u) => ({ ...map, [u.uid!]: u }), {});
        });
      });

    this.finishLoading();

    this.messagesSub = this.messages$
      .pipe(take(1))
      .subscribe((msgs: Message[]) => {
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
    if (this.chatPartner) {
      this.userSelected.emit(this.chatPartner);
      this.closeProfileModal();
    }
  }

  openThread(msg: Message) {
    if (!this.groupId || !msg.id) return;
    this.threadSelected.emit({
      groupId: this.groupId,
      messageId: msg.id,
    });
  }

  openProfileModal() {
    this.showProfileModal = true;
  }

  closeProfileModal() {
    this.showProfileModal = false;
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
    if (this.currentGroup) {
      this.newGroupName = this.currentGroup.name;
      this.newGroupDescription = this.currentGroup.description || '';
    }
  }

  closeGroupSettingsModal() {
    this.showGroupSettingsModal = false;
    this.editingGroupName = false;
    this.editingGroupDescription = false;
  }

  startEditGroupName() {
    this.editingGroupName = true;
    this.newGroupName = this.currentGroup?.name || '';
  }
  cancelEditGroupName() {
    this.editingGroupName = false;
    this.newGroupName = this.currentGroup?.name || '';
  }
  async saveGroupName() {
    if (!this.groupId) return;
    await this.groupService.updateGroup(this.groupId, {
      name: this.newGroupName,
    });
    this.editingGroupName = false;
  }

  startEditGroupDescription() {
    this.editingGroupDescription = true;
    this.newGroupDescription = this.currentGroup?.description || '';
  }
  cancelEditGroupDescription() {
    this.editingGroupDescription = false;
    this.newGroupDescription = this.currentGroup?.description || '';
  }
  async saveGroupDescription() {
    if (!this.groupId) return;
    await this.groupService.updateGroup(this.groupId, {
      description: this.newGroupDescription,
    });
    this.editingGroupDescription = false;
  }

  async leaveChannel() {
    if (!this.groupId || !this.currentUserUid) return;
    await this.groupService.removeUserFromGroup(
      this.groupId,
      this.currentUserUid
    );
    this.closeGroupSettingsModal();
    this.closedChannel.emit();
  }

  toggleEmojiPicker() {
    this.showEmojiPicker = !this.showEmojiPicker;
  }

  addEmoji(event: any) {
    this.newMessage += event.detail.unicode;
    this.showEmojiPicker = false;
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
    this.newMessage = '';

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
