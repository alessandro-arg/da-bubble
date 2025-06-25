import {
  Component,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService } from '../../user.service';
import { User } from '../../models/user.model';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.scss',
})
export class UserListComponent implements OnInit, OnDestroy {
  @Output() userSelected = new EventEmitter<User>();

  users: User[] = [];
  currentUserUid: string | null = null;
  activeUserUid: string | null = null;
  private authUnsub?: () => void;
  private usersSub?: Subscription;

  direktDropdownOpen = true;
  direktArrowHover = false;
  direktAccountHover = false;
  channelsDropdownOpen = true;
  channelsArrowHover = false;
  channelsAccountHover = false;

  constructor(private userService: UserService, private auth: Auth) {}

  ngOnInit() {
    this.authUnsub = onAuthStateChanged(this.auth, (user) => {
      this.currentUserUid = user?.uid ?? null;
      this.listenToUsers();
    });
  }

  ngOnDestroy(): void {
    if (this.authUnsub) this.authUnsub();
    if (this.usersSub) this.usersSub.unsubscribe();
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

  onClick(user: User) {
    if (user.uid !== this.currentUserUid) {
      this.activeUserUid = user.uid;
      this.userSelected.emit(user);
    }
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
