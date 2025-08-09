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
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  QueryList,
  SimpleChanges,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService } from '../../services/user.service';
import { User } from '../../models/user.model';
import { GroupService } from '../../services/group.service';
import { Group } from '../../models/group.model';
import { MobileService } from '../../services/mobile.service';
import { Subscription } from 'rxjs';
import { PresenceService } from '../../services/presence.service';

@Component({
  selector: 'app-searchbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './searchbar.component.html',
  styleUrls: ['./searchbar.component.scss'],
})
export class SearchbarComponent implements OnInit, OnChanges, OnDestroy {
  @Output() userSelected = new EventEmitter<User>();
  @Output() groupSelected = new EventEmitter<string>();
  @Input() currentUserUid!: string | null;

  statusMap: Record<string, boolean> = {};
  private presenceSubs: Subscription[] = [];
  private usersSub?: Subscription;
  private groupsSub?: Subscription;

  myGroups: Group[] = [];
  showPopup = false;
  searchQuery = '';
  filteredUsers: User[] = [];
  filteredGroups: Group[] = [];
  allUsers: User[] = [];
  allGroups: Group[] = [];
  activeIndex = 0;
  activeList: 'users' | 'groups' | null = null;
  isMobile = false;

  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;
  @ViewChildren('userItem', { read: ElementRef }) userItems!: QueryList<
    ElementRef<HTMLElement>
  >;
  @ViewChildren('groupItem', { read: ElementRef }) groupItems!: QueryList<
    ElementRef<HTMLElement>
  >;

  constructor(
    private userService: UserService,
    private groupService: GroupService,
    private presence: PresenceService,
    private mobileService: MobileService
  ) {
    this.usersSub = this.userService.getAllUsersLive().subscribe((users) => {
      this.allUsers = users.sort((a, b) => a.name.localeCompare(b.name));
      this.presenceSubs.forEach((s) => s.unsubscribe());
      this.presenceSubs = users
        .filter((u) => u.uid)
        .map((u) =>
          this.presence.getUserStatus(u.uid!).subscribe((rec) => {
            this.statusMap[u.uid!] = rec.state === 'online';
          })
        );
    });

    this.loadAllUsers();
  }

  /**
   * Initializes the component, including checking for mobile device context.
   */
  ngOnInit() {
    this.mobileService.isMobile$.subscribe((isMobile) => {
      this.isMobile = isMobile;
    });
    if (this.currentUserUid) this.startGroupsLive(this.currentUserUid);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['currentUserUid'] && this.currentUserUid) {
      this.startGroupsLive(this.currentUserUid);
    }
  }

  ngOnDestroy() {
    this.groupsSub?.unsubscribe();
  }

  private startGroupsLive(uid: string) {
    this.groupsSub?.unsubscribe();
    this.groupsSub = this.groupService
      .getGroupsByMemberLive(uid)
      .subscribe((groups) => {
        this.myGroups = groups;
        if (this.searchQuery.startsWith('#')) {
          this.filterGroupsByQuery();
        }
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
   * Handles changes in the mention input field (`@user` or `#group`) and updates the filtered lists accordingly.
   *
   * - If empty input, hides the popup and resets state.
   * - If starts with `@`, filters `allUsers` by name.
   * - If starts with `#`, filters `myGroups` by name.
   * - Otherwise, clears the filtered lists and hides the popup.
   *
   * @param {Event} event - The input event triggered when the user types in the mention field.
   */
  async onInputChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchQuery = input.value;

    if (!this.searchQuery) {
      this.showPopup = false;
      this.activeList = null;
      return;
    }

    const first = this.searchQuery[0];
    const rest = this.searchQuery.slice(1).toLowerCase();

    if (first === '@') {
      this.filteredUsers = rest
        ? this.allUsers.filter((u) => u.name.toLowerCase().startsWith(rest))
        : [...this.allUsers];
      this.filteredGroups = [];
      this.activeList = 'users';
      this.activeIndex = 0;
      this.showPopup = true;
      setTimeout(() => this.scrollActiveIntoView(), 0);
      return;
    }

    if (first === '#') {
      this.filterGroupsByQuery();
      return;
    }

    this.filteredUsers = [];
    this.filteredGroups = [];
    this.activeList = null;
    this.showPopup = false;
  }

  /**
   * Filters the list of groups (`myGroups`) based on the current search query after `#`.
   *
   * - Matches group names starting with the query (case-insensitive).
   * - If no query is present, copies all groups into the filtered list.
   *
   * @private
   */
  private filterGroupsByQuery() {
    const rest = this.searchQuery.slice(1).trim().toLowerCase();
    this.filteredGroups = rest
      ? this.myGroups.filter((g) => g.name.toLowerCase().startsWith(rest))
      : [...this.myGroups];

    this.filteredUsers = [];
    this.activeList = 'groups';
    this.activeIndex = 0;
    this.showPopup = true;

    setTimeout(() => this.scrollActiveIntoView(), 0);
  }

  /**
   * Handles keyboard navigation for the mention suggestions popup.
   *
   * - `ArrowDown` / `ArrowUp` → Move selection.
   * - `Enter` / `Tab` → Select current suggestion.
   * - `Escape` → Close popup.
   *
   * @param {KeyboardEvent} e - The keyboard event triggered by the user.
   */
  onKeydown(e: KeyboardEvent) {
    if (!this.showPopup || !this.activeList) return;

    const listLength =
      this.activeList === 'users'
        ? this.filteredUsers.length
        : this.filteredGroups.length;

    if (listLength === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.activeIndex = (this.activeIndex + 1) % listLength;
      this.scrollActiveIntoView();
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.activeIndex = (this.activeIndex - 1 + listLength) % listLength;
      this.scrollActiveIntoView();
      return;
    }

    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      if (this.activeList === 'users') {
        const u = this.filteredUsers[this.activeIndex];
        if (u) this.selectUser(u);
      } else {
        const g = this.filteredGroups[this.activeIndex];
        if (g) this.selectGroup(g);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      this.showPopup = false;
      return;
    }
  }

  /**
   * Scrolls the currently active suggestion into view within the popup list.
   *
   * @private
   */
  private scrollActiveIntoView() {
    let items: ElementRef<HTMLElement>[];
    if (this.activeList === 'users') {
      items = this.userItems?.toArray() ?? [];
    } else if (this.activeList === 'groups') {
      items = this.groupItems?.toArray() ?? [];
    } else {
      return;
    }
    items[this.activeIndex]?.nativeElement.scrollIntoView({ block: 'nearest' });
  }

  /**
   * Called when a user is selected from the search results.
   * Clears the search and emits the `userSelected` event.
   * @param user The selected user
   */
  selectUser(user: User) {
    this.searchQuery = '';
    this.showPopup = false;
    this.activeList = null;
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
    this.activeList = null;
    this.groupSelected.emit(group.id!);
  }
}
