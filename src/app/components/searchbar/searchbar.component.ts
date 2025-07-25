// searchbar.component.ts
import { Component, EventEmitter, HostListener, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService } from '../../user.service';
import { User } from '../../models/user.model';
import { ChatService } from '../../chat.service';
import { GroupService } from '../../group.service';
import { Group } from '../../models/group.model';

@Component({
  selector: 'app-searchbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './searchbar.component.html',
  styleUrls: ['./searchbar.component.scss'],
})
export class SearchbarComponent {
  showPopup = false;
  searchQuery = '';
  filteredUsers: User[] = [];
  filteredGroups: Group[] = [];
  allUsers: User[] = [];
  allGroups: Group[] = [];
  searchMode: 'name' | 'mention' = 'name';
  currentSearchType: 'users' | 'groups' = 'users';
  @Output() userSelected = new EventEmitter<User>();
  @Output() groupSelected = new EventEmitter<string>();

  constructor(
    private userService: UserService,
    private chatService: ChatService,
    private groupService: GroupService
  ) {
    this.loadAllUsers();
    this.loadAllGroups();
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

    if (this.searchQuery.includes('@')) {
      this.searchMode = 'mention';
      this.currentSearchType = 'users';
      const query = this.searchQuery.split('@').pop()?.trim() || '';

      this.filteredUsers =
        query.length > 0
          ? this.allUsers.filter((user) =>
              user.name.toLowerCase().includes(query.toLowerCase())
            )
          : [...this.allUsers];

      this.showPopup = true;
    } else if (this.searchQuery.length > 0) {
      // Suche nach Benutzern und Gruppen
      const query = this.searchQuery.toLowerCase();

      this.filteredUsers = this.allUsers.filter((user) =>
        user.name.toLowerCase().includes(query)
      );

      this.filteredGroups = this.allGroups.filter((group) =>
        group.name.toLowerCase().includes(query)
      );

      this.showPopup =
        this.filteredUsers.length > 0 || this.filteredGroups.length > 0;
    } else {
      this.showPopup = false;
    }
  }

  selectUser(user: User) {
    if (this.searchMode === 'mention') {
      const currentText = this.searchQuery;
      const atPosition = currentText.lastIndexOf('@');
      if (atPosition >= 0) {
        this.searchQuery =
          currentText.substring(0, atPosition) + '@' + user.name + ' ';
      } else {
        this.searchQuery = currentText + '@' + user.name + ' ';
      }
      return;
    }
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
