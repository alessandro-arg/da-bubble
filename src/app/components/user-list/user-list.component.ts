import {
  Component,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  Input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService } from '../../user.service';
import { User } from '../../models/user.model';
import { Group } from '../../models/group.model';
import { Auth, onAuthStateChanged, user } from '@angular/fire/auth';
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

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, CreateGroupModalComponent],
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.scss',
})
export class UserListComponent implements OnInit, OnDestroy {
  @Input() selectedUserUid: string | null = null;
  @Input() selectedGroupId: string | null = null;
  @Output() userSelected = new EventEmitter<User>();
  @Output() groupSelected = new EventEmitter<string>();
  @Output() userProfileClicked = new EventEmitter<User>();

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
  showAddGroupModal = false;

  constructor(
    private userService: UserService,
    private auth: Auth,
    private firestore: Firestore
  ) {}

  ngOnInit() {
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

  listenToUsers() {
    this.usersSub = this.userService.getAllUsersLive().subscribe((allUsers) => {
      const filtered = allUsers.filter((u) => u.name !== 'Gast');
      this.users = filtered.sort((a, b) => {
        if (a.uid === this.currentUserUid) return -1;
        if (b.uid === this.currentUserUid) return 1;
        return a.name.localeCompare(b.name);
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

  openAddGroupModal() {
    this.showAddGroupModal = true;
  }

  closeAddGroupModal() {
    this.showAddGroupModal = false;
  }

  onClick(user: User) {
    if (user.uid !== this.currentUserUid) {
      this.activeUserUid = user.uid;
      this.activeGroupId = null;
      this.userSelected.emit(user);
    }
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
      ? 'assets/img/icons/account_circle_purple.png'
      : 'assets/img/icons/account_circle.png';
  }
}
