// searchbar.component.ts
import {
  Component,
  EventEmitter,
  HostListener,
  OnInit,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService } from '../../user.service';
import { User } from '../../models/user.model';
import { ChatService } from '../../chat.service';
import { GroupService } from '../../group.service';
import { Group } from '../../models/group.model';
import { MobileService } from '../../mobile.service';

@Component({
  selector: 'app-searchbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './searchbar.component.html',
  styleUrls: ['./searchbar.component.scss'],
})
export class SearchbarComponent implements OnInit {
  @Output() userSelected = new EventEmitter<User>();
  @Output() groupSelected = new EventEmitter<string>();

  showPopup = false;
  searchQuery = '';
  filteredUsers: User[] = [];
  filteredGroups: Group[] = [];
  allUsers: User[] = [];
  allGroups: Group[] = [];
  searchMode: 'name' | 'mention' = 'name';
  currentSearchType: 'users' | 'groups' = 'users';

  isMobile = false;

  constructor(
    private userService: UserService,
    private chatService: ChatService,
    private groupService: GroupService,
    private mobileService: MobileService
  ) {
    this.loadAllUsers();
    this.loadAllGroups();
  }

  ngOnInit() {
    this.mobileService.isMobile$.subscribe((isMobile) => {
      this.isMobile = isMobile;
    });
  }

  private async loadAllUsers() {
    this.allUsers = await this.userService.getAllUsers();
    this.allUsers.sort((a, b) => a.name.localeCompare(b.name));
    this.filteredUsers = [...this.allUsers];
  }

  private async loadAllGroups() {
    const groups = await this.groupService.getAllGroups();
    this.allGroups = groups;
    this.filteredGroups = [...this.allGroups];
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (
      !target.closest('.show-popup-user-list') &&
      !target.closest('input[type="text"]')
    ) {
      this.showPopup = false;
    }
  }

  async onInputChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchQuery = input.value;

    if (!this.searchQuery) {
      this.showPopup = false;
      return;
    }

    const first = this.searchQuery[0];
    const rest = this.searchQuery.slice(1).toLowerCase();

    if (first === '@') {
      // user‐only search
      this.filteredUsers = rest
        ? this.allUsers.filter((u) => u.name.toLowerCase().includes(rest))
        : [...this.allUsers];
      this.filteredGroups = [];
      this.showPopup = this.filteredUsers.length > 0;
    } else if (first === '#') {
      // group‐only search
      this.filteredGroups = rest
        ? this.allGroups.filter((g) => g.name.toLowerCase().includes(rest))
        : [...this.allGroups];
      this.filteredUsers = [];
      this.showPopup = this.filteredGroups.length > 0;
    } else {
      // neither @ nor # → hide
      this.filteredUsers = [];
      this.filteredGroups = [];
      this.showPopup = false;
    }
  }

  selectUser(user: User) {
    // for an @mention you might want to insert into a larger text, but here we'll
    // just fire the event and clear
    this.searchQuery = '';
    this.showPopup = false;
    this.userSelected.emit(user);
  }

  selectGroup(group: Group) {
    this.searchQuery = '';
    this.showPopup = false;
    this.groupSelected.emit(group.id!);
  }
}
