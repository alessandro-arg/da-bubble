/**
 * Component that provides a search bar for finding users or groups
 * by entering `@name` or `#group`. Emits selection events for integration
 * with private or group chat navigation.
 */

import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService } from '../../services/user.service';
import { User } from '../../models/user.model';
import { GroupService } from '../../services/group.service';
import { Group } from '../../models/group.model';
import { MobileService } from '../../services/mobile.service';

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

  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  constructor(
    private userService: UserService,
    private groupService: GroupService,
    private mobileService: MobileService
  ) {
    this.loadAllUsers();
    this.loadAllGroups();
  }

  /**
   * Initializes the component, including checking for mobile device context.
   */
  ngOnInit() {
    this.mobileService.isMobile$.subscribe((isMobile) => {
      this.isMobile = isMobile;
    });
  }

  /**
   * Focus the searchbar with the Ctrl + K keyboard combination.
   */
  focusInput() {
    const el = this.searchInput?.nativeElement;
    if (!el) return;

    setTimeout(() => {
      el.focus();
      el.select();
    });
  }

  /**
   * Loads and caches all users, sorted alphabetically.
   */
  private async loadAllUsers() {
    this.allUsers = await this.userService.getAllUsers();
    this.allUsers.sort((a, b) => a.name.localeCompare(b.name));
    this.filteredUsers = [...this.allUsers];
  }

  /**
   * Loads and caches all groups.
   */
  private async loadAllGroups() {
    const groups = await this.groupService.getAllGroups();
    this.allGroups = groups;
    this.filteredGroups = [...this.allGroups];
  }

  /**
   * Detects clicks outside the search popup or input field and hides the popup.
   * @param event Mouse click event
   */
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

  /**
   * Handles input changes to detect mentions or group references
   * and filter the available users/groups accordingly.
   * @param event Input event from the search field
   */
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
      this.filteredUsers = rest
        ? this.allUsers.filter((u) => u.name.toLowerCase().includes(rest))
        : [...this.allUsers];
      this.filteredGroups = [];
      this.showPopup = this.filteredUsers.length > 0;
    } else if (first === '#') {
      this.filteredGroups = rest
        ? this.allGroups.filter((g) => g.name.toLowerCase().includes(rest))
        : [...this.allGroups];
      this.filteredUsers = [];
      this.showPopup = this.filteredGroups.length > 0;
    } else {
      this.filteredUsers = [];
      this.filteredGroups = [];
      this.showPopup = false;
    }
  }

  /**
   * Called when a user is selected from the search results.
   * Clears the search and emits the `userSelected` event.
   * @param user The selected user
   */
  selectUser(user: User) {
    this.searchQuery = '';
    this.showPopup = false;
    this.userSelected.emit(user);
  }

  /**
   * Called when a group is selected from the search results.
   * Clears the search and emits the `groupSelected` event.
   * @param group The selected group
   */
  selectGroup(group: Group) {
    this.searchQuery = '';
    this.showPopup = false;
    this.groupSelected.emit(group.id!);
  }
}
