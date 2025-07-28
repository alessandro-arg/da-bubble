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
import { UserService } from '../../user.service';
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
import { PresenceService } from '../../presence.service';
import { SearchbarComponent } from '../searchbar/searchbar.component';
import { MobileService } from '../../mobile.service';

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

  ngOnDestroy(): void {
    this.authUnsub?.();
    this.usersSub?.unsubscribe();
    this.groupsSub?.unsubscribe();
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: UIEvent) {
    if (this.isBrowser) {
      this.screenWidth = (event.target as Window).innerWidth;
    }
  }

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

  onEditClick() {
    this.editClicked.emit();
  }

  openAddGroupModal() {
    this.showAddGroupModal = true;
  }

  closeAddGroupModal() {
    this.showAddGroupModal = false;
  }

  onClick(user: User) {
    this.activeUserUid = user.uid;
    this.activeGroupId = null;
    this.userSelected.emit(user);
  }

  onProfileClick(user: User) {
    this.userProfileClicked.emit(user);
  }

  onGroupClick(g: Group) {
    this.activeGroupId = g.id;
    this.activeUserUid = null;
    this.groupSelected.emit(g.id);
  }

  toggleDirektDropdown() {
    this.direktDropdownOpen = !this.direktDropdownOpen;
  }

  toggleChannelsDropdown() {
    this.channelsDropdownOpen = !this.channelsDropdownOpen;
  }

  openPrivateChat(user: User) {
    this.userSelected.emit(user);
  }

  openGroupChat(groupId: string) {
    this.groupSelected.emit(groupId);
  }

  get direktArrowSrc() {
    if (this.direktArrowHover) {
      return 'assets/img/icons/arrow_drop_down_purple.png';
    }
    return 'assets/img/icons/arrow_drop_down.png';
  }

  get direktAccountSrc() {
    return this.direktAccountHover
      ? 'assets/img/icons/account_circle_purple.png'
      : 'assets/img/icons/account_circle.png';
  }

  get channelsArrowSrc() {
    if (this.channelsArrowHover) {
      return 'assets/img/icons/arrow_drop_down_purple.png';
    }
    return 'assets/img/icons/arrow_drop_down.png';
  }

  get channelsAccountSrc() {
    return this.channelsAccountHover
      ? 'assets/img/icons/workspaces_purple.png'
      : 'assets/img/icons/workspaces.png';
  }
}
