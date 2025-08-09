/**
 * LandingPageComponent is the main container for the chat UI.
 * It handles user sessions, responsive behavior, navigation between
 * private chats, group chats, and message threads.
 */

import {
  Component,
  HostListener,
  ElementRef,
  OnInit,
  ViewChild,
  Inject,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService } from '../../services/user.service';
import { User } from '../../models/user.model';
import { ActivatedRoute } from '@angular/router';
import { SearchbarComponent } from '../../components/searchbar/searchbar.component';
import { UserListComponent } from '../../components/user-list/user-list.component';
import { WorkspaceToggleButtonComponent } from '../../components/workspace-toggle-button/workspace-toggle-button.component';
import { ChatComponent } from '../chat/chat.component';
import { ThreadComponent } from '../thread/thread.component';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { PresenceService } from '../../services/presence.service';
import { MobileService } from '../../services/mobile.service';
import { AvatarEditModalComponent } from './avatar-edit-modal/avatar-edit-modal.component';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SearchbarComponent,
    UserListComponent,
    WorkspaceToggleButtonComponent,
    ChatComponent,
    ThreadComponent,
    AvatarEditModalComponent,
  ],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.scss',
})
export class LandingPageComponent implements OnInit {
  screenWidth = 0;
  isMobile = false;
  showDropdown = false;
  showProfileModal = false;
  showAvatarEditor = false;

  currentUser: User | null = null;
  isEditingName = false;
  editedName: string = '';
  nameError: string | null = null;

  profileUser: User | null = null;
  selectedUser: User | null = null;
  selectedGroupId: string | null = null;
  currentUserUid: string | null = null;
  currentUserHovered = false;

  threadGroupId: string | null = null;
  threadMessageId: string | null = null;

  isCollapsed = false;
  threadVisible = false;

  newMessageMode = false;
  private isBrowser: boolean;

  @ViewChild('userListDiv') userListDiv!: ElementRef<HTMLDivElement>;
  @ViewChild('chatListDiv') chatListDiv!: ElementRef<HTMLDivElement>;
  @ViewChild('searchbarCmp') searchbar?: SearchbarComponent;

  constructor(
    @Inject(PLATFORM_ID) platformId: Object,
    private auth: Auth,
    private userService: UserService,
    private router: Router,
    private route: ActivatedRoute,
    private eRef: ElementRef,
    private presence: PresenceService,
    private mobileService: MobileService
  ) {
    this.isBrowser = isPlatformBrowser(platformId);

    this.route.paramMap.subscribe(async (params) => {
      const uid = params.get('uid');
      if (uid) {
        this.currentUser = await this.userService.getUser(uid);
      }
    });
  }

  /**
   * Initializes the component: checks auth, sets responsive state.
   */
  ngOnInit() {
    this.mobileService.isMobile$.subscribe((isMobile) => {
      this.isMobile = isMobile;
    });

    onAuthStateChanged(
      this.auth,
      (user) => (this.currentUserUid = user?.uid ?? null)
    );

    if (this.isBrowser) {
      this.screenWidth = window.innerWidth;
    }
  }

  /**
   * Updates screen width on browser resize.
   */
  @HostListener('window:resize', ['$event'])
  onResize(event: UIEvent) {
    if (this.isBrowser) {
      this.screenWidth = (event.target as Window).innerWidth;
    }
  }

  /**
   * Handles the global keyboard shortcut for focusing the search bar.
   *
   * Listens for `Ctrl+K` (Windows/Linux) or `Cmd+K` (macOS) and,
   * when pressed, prevents the default browser action and calls
   * the `focusInput()` method on the `SearchbarComponent` to
   * focus the search input field.
   *
   * @param {KeyboardEvent} ev - The keyboard event object triggered by the user's key press.
   */
  @HostListener('window:keydown', ['$event'])
  onGlobalKeydown(ev: KeyboardEvent) {
    const isK = ev.key?.toLowerCase() === 'k';
    const modifier = ev.ctrlKey || ev.metaKey;
    const target = ev.target as HTMLElement | null;
    const tag = target?.tagName?.toLowerCase();
    const isTypingField =
      tag === 'input' || tag === 'textarea' || target?.isContentEditable;

    const overlaysOpen = this.showDropdown || this.showProfileModal;

    if (modifier && isK && !isTypingField && !overlaysOpen) {
      ev.preventDefault();

      if (this.screenWidth >= 1024) {
        this.searchbar?.focusInput();
      }
    }
  }

  /**
   * Opens a private chat with the selected user.
   */
  openPrivateChat(user: User) {
    this.selectedGroupId = null;
    this.selectedUser = user;
    this.threadGroupId = null;
    this.threadMessageId = null;
    this.threadVisible = false;
    this.newMessageMode = false;

    if (this.isBrowser && this.screenWidth < 1024) {
      this.userListDiv.nativeElement.style.display = 'none';
    }
  }

  /**
   * Opens the profile modal for a given user.
   */
  openProfileModalFromUser(user: User) {
    this.profileUser = user;
    this.showProfileModal = true;
  }

  /**
   * Opens a group chat.
   */
  openGroupChat(groupId: string) {
    this.selectedUser = null;
    this.selectedGroupId = groupId;
    this.threadGroupId = null;
    this.threadMessageId = null;
    this.threadVisible = false;
    this.newMessageMode = false;

    if (this.isBrowser && this.screenWidth < 1024) {
      this.userListDiv.nativeElement.style.display = 'none';
    }
  }

  /**
   * Handles thread selection from chat component.
   */
  onThreadSelected(ev: { groupId: string; messageId: string }) {
    this.threadGroupId = ev.groupId;
    this.threadMessageId = ev.messageId;
    this.threadVisible = true;

    if (this.isBrowser && this.screenWidth < 1024) {
      this.chatListDiv.nativeElement.style.display = 'none';
    }
  }

  /**
   * Closes the thread view.
   */
  onCloseThread() {
    this.threadGroupId = null;
    this.threadMessageId = null;
    this.threadVisible = false;

    if (this.isBrowser && this.screenWidth < 1024) {
      this.chatListDiv.nativeElement.style.display = 'flex';
    }
  }

  /**
   * Resets the current channel view on close.
   */
  onChannelClosed() {
    this.selectedGroupId = null;
    this.selectedUser = null;
    this.threadVisible = false;
    this.newMessageMode = false;
  }

  /** Toggles the sidebar/workspace visibility. */
  toggleWorkspace() {
    this.isCollapsed = !this.isCollapsed;
  }

  /** Toggles the top-right dropdown menu. */
  toggleDropdown() {
    this.showDropdown = !this.showDropdown;
  }

  /** Opens the current user's profile modal. */
  openProfileModal() {
    this.showDropdown = false;
    this.showProfileModal = true;
  }

  openAvatarEditor() {
    this.showAvatarEditor = true;
  }

  /** Closes the profile modal and resets edit state. */
  closeProfileModal() {
    if (this.isEditingName) {
      this.isEditingName = false;
    }
    this.showProfileModal = false;
    this.showDropdown = true;
  }

  /** Closes all modals (dropdown, profile). */
  closeModals() {
    this.showDropdown = false;
    this.showProfileModal = false;
  }

  /** Enables name editing for the current user. */
  enableEdit() {
    this.editedName = this.currentUser?.name || '';
    this.isEditingName = true;
  }

  /**
   * Validates the edited name (must include first and last name).
   * @returns true if valid, false otherwise.
   */
  validateName() {
    const name = this.editedName.trim();
    const isValid = /^[A-Za-zÄäÖöÜüß]+\s+[A-Za-zÄäÖöÜüß]+$/.test(name);
    this.nameError = isValid ? null : 'Please enter your first and last name';
    return isValid;
  }

  /**
   * Saves the edited name to the database if valid.
   */
  async saveName() {
    if (!this.validateName()) return;

    try {
      if (this.currentUser?.uid) {
        await this.userService.updateUser(this.currentUser.uid, {
          name: this.editedName.trim(),
        });

        this.currentUser.name = this.editedName.trim();
        this.isEditingName = false;
      }
    } catch (error) {
      console.error('Name konnte nicht gespeichert werden:', error);
    }
  }

  async uploadAvatar(newAvatar: string) {
    if (!this.currentUser) return;
    await this.userService.updateUser(this.currentUser.uid, {
      avatar: newAvatar,
    });
    this.currentUser.avatar = newAvatar;
    this.showAvatarEditor = false;
  }

  /**
   * Logs the user out and updates presence to offline.
   */
  async logout() {
    try {
      if (this.currentUserUid) {
        await this.presence.forceOffline(this.currentUserUid);
      }
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  /** Opens the UI for composing a new message. */
  onNewMessage() {
    this.selectedUser = null;
    this.selectedGroupId = null;
    this.newMessageMode = true;
  }

  /**
   * Closes modals if user clicks outside of them.
   */
  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    if (
      (this.showDropdown || this.showProfileModal) &&
      !this.eRef.nativeElement.contains(event.target)
    ) {
      this.closeModals();
    }
  }

  /** Resets all views to the initial state in mobile mode. */
  goBackMobile() {
    this.selectedUser = null;
    this.selectedGroupId = null;
    this.newMessageMode = false;
    this.threadVisible = false;
  }
}
