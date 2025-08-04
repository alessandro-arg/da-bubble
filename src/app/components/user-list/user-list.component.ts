/**
 * UserListComponent displays a list of users and groups for chatting.
 * It supports selecting users or groups, opening modals, and toggling dropdowns.
 * This component also tracks online presence and is responsive for mobile view.
 */

import {
  Component,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  Input,
  Inject,
  PLATFORM_ID,
  HostListener,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { UserService } from '../../services/user.service';
import { User } from '../../models/user.model';
import { Group } from '../../models/group.model';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import {
  Firestore,
  collection,
  query,
  where,
  collectionData,
  CollectionReference,
  Query,
} from '@angular/fire/firestore';
import { Subscription } from 'rxjs';
import { CreateGroupModalComponent } from './create-group-modal/create-group-modal.component';
import { PresenceService } from '../../services/presence.service';
import { SearchbarComponent } from '../searchbar/searchbar.component';
import { MobileService } from '../../services/mobile.service';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, CreateGroupModalComponent, SearchbarComponent],
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.scss',
})
export class UserListComponent implements OnInit, OnDestroy {
  @Input() selectedUserUid: string | null = null;
  @Input() selectedGroupId: string | null = null;
  @Output() userSelected = new EventEmitter<User>();
  @Output() groupSelected = new EventEmitter<string>();
  @Output() userProfileClicked = new EventEmitter<User>();
  @Output() editClicked = new EventEmitter<void>();

  users: User[] = [];
  groups: Group[] = [];
  currentUserUid: string | null = null;
  activeUserUid: string | null = null;
  activeGroupId: string | null = null;

  private authUnsub?: () => void;
  private usersSub?: Subscription;
  private groupsSub?: Subscription;

  direktDropdownOpen = true;
  direktArrowHover = false;
  direktAccountHover = false;
  channelsDropdownOpen = true;
  channelsArrowHover = false;
  channelsAccountHover = false;
  addChannelHover = false;
  addChannelHover2 = false;
  hoveredGroupId: string | null = null;
  showAddGroupModal = false;
  editSquareHovered = false;

  screenWidth = 0;
  isMobile = false;
  private isBrowser: boolean;

  constructor(
    @Inject(PLATFORM_ID) platformId: Object,
    private userService: UserService,
    private auth: Auth,
    private firestore: Firestore,
    private presence: PresenceService,
    private mobileService: MobileService
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  /**
   * Subscribes to mobile detection, auth state, and initializes screen width.
   */
  ngOnInit() {
    this.mobileService.isMobile$.subscribe((isMobile) => {
      this.isMobile = isMobile;
    });

    if (this.isBrowser) {
      this.screenWidth = window.innerWidth;
    }

    this.authUnsub = onAuthStateChanged(this.auth, (user) => {
      this.currentUserUid = user?.uid ?? null;
      this.listenToUsers();
      this.listenToGroups();
    });
  }

  /**
   * Cleans up subscriptions on destroy.
   */
  ngOnDestroy(): void {
    this.authUnsub?.();
    this.usersSub?.unsubscribe();
    this.groupsSub?.unsubscribe();
  }

  /**
   * Updates screen width on window resize.
   * @param event UIEvent
   */
  @HostListener('window:resize', ['$event'])
  onResize(event: UIEvent) {
    if (this.isBrowser) {
      this.screenWidth = (event.target as Window).innerWidth;
    }
  }

  /**
   * Subscribes to live user updates and tracks online presence.
   */
  listenToUsers() {
    this.usersSub = this.userService.getAllUsersLive().subscribe((allUsers) => {
      const filtered = allUsers.filter((u) => u.name !== 'Gast');
      this.users = filtered.sort((a, b) => {
        if (a.uid === this.currentUserUid) return -1;
        if (b.uid === this.currentUserUid) return 1;
        return a.name.localeCompare(b.name);
      });

      this.users.forEach((u) => {
        this.presence.getUserStatus(u.uid).subscribe((status) => {
          u.online = status?.state === 'online';
        });
      });
    });
  }

  /**
   * Subscribes to groups the current user participates in.
   */
  listenToGroups() {
    if (!this.currentUserUid) {
      return;
    }
    const groupsRef = collection(
      this.firestore,
      'groups'
    ) as CollectionReference<Group>;

    const q: Query<Group> = query(
      groupsRef,
      where('participants', 'array-contains', this.currentUserUid)
    );

    this.groupsSub = collectionData<Group>(q, { idField: 'id' }).subscribe(
      (groups) => {
        this.groups = groups;
      }
    );
  }

  /** Emits the editClicked event */
  onEditClick() {
    this.editClicked.emit();
  }

  /** Opens the modal to create a new group */
  openAddGroupModal() {
    this.showAddGroupModal = true;
  }

  /** Closes the create group modal */
  closeAddGroupModal() {
    this.showAddGroupModal = false;
  }

  /**
   * Emits a userSelected event and sets the active user.
   * @param user Selected user
   */
  onClick(user: User) {
    this.activeUserUid = user.uid;
    this.activeGroupId = null;
    this.userSelected.emit(user);
  }

  /**
   * Emits a userProfileClicked event.
   * @param user User whose profile was clicked
   */
  onProfileClick(user: User) {
    this.userProfileClicked.emit(user);
  }

  /**
   * Emits a groupSelected event and sets the active group.
   * @param g Selected group
   */
  onGroupClick(g: Group) {
    this.activeGroupId = g.id;
    this.activeUserUid = null;
    this.groupSelected.emit(g.id);
  }

  /** Toggles the "Direktnachrichten" dropdown visibility */
  toggleDirektDropdown() {
    this.direktDropdownOpen = !this.direktDropdownOpen;
  }

  /** Toggles the "Channels" dropdown visibility */
  toggleChannelsDropdown() {
    this.channelsDropdownOpen = !this.channelsDropdownOpen;
  }

  /**
   * Emits userSelected event for direct chat.
   * @param user Target user
   */
  openPrivateChat(user: User) {
    this.userSelected.emit(user);
  }

  /**
   * Emits groupSelected event for group chat.
   * @param groupId Target group ID
   */
  openGroupChat(groupId: string) {
    this.groupSelected.emit(groupId);
  }

  /** Returns appropriate arrow icon for direct chat dropdown */
  get direktArrowSrc() {
    if (this.direktArrowHover) {
      return 'assets/img/icons/arrow_drop_down_purple.png';
    }
    return 'assets/img/icons/arrow_drop_down.png';
  }

  /** Returns account icon for direct chats */
  get direktAccountSrc() {
    return this.direktAccountHover
      ? 'assets/img/icons/account_circle_purple.png'
      : 'assets/img/icons/account_circle.png';
  }

  /** Returns appropriate arrow icon for channels dropdown */
  get channelsArrowSrc() {
    if (this.channelsArrowHover) {
      return 'assets/img/icons/arrow_drop_down_purple.png';
    }
    return 'assets/img/icons/arrow_drop_down.png';
  }

  /** Returns account icon for channels */
  get channelsAccountSrc() {
    return this.channelsAccountHover
      ? 'assets/img/icons/workspaces_purple.png'
      : 'assets/img/icons/workspaces.png';
  }
}
