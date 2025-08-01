/**
 * Displays the header section for a group chat.
 * Provides UI for viewing group members, managing group settings,
 * and adding new members (for the group creator).
 * Also handles responsive behavior for mobile devices.
 */

import {
  Component,
  Input,
  Output,
  EventEmitter,
  HostListener,
} from '@angular/core';
import { User } from '../../models/user.model';
import { Group } from '../../models/group.model';
import { GroupService } from '../../services/group.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GroupSettingsModalComponent } from '../group-settings-modal/group-settings-modal.component';
import { GroupMembersModalComponent } from '../group-members-modal/group-members-modal.component';
import { AddMembersModalComponent } from '../add-members-modal/add-members-modal.component';
import { MobileService } from '../../services/mobile.service';

@Component({
  selector: 'app-group-header',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    GroupSettingsModalComponent,
    GroupMembersModalComponent,
    AddMembersModalComponent,
  ],
  templateUrl: './group-header.component.html',
  styleUrl: './group-header.component.scss',
})
export class GroupHeaderComponent {
  @Input() group!: Group;
  @Input() participantsMap: Record<string, User> = {};
  @Input() currentUserUid!: string | null;
  @Input() isCreator = false;

  @Output() closedChannel = new EventEmitter<void>();
  @Output() memberClicked = new EventEmitter<User>();

  allUsers: User[] = [];
  searchTerm = '';
  filteredUsers: User[] = [];
  selectedUsers: User[] = [];

  showGroupSettingsModal = false;
  showMembersModal = false;
  showAddMembersModal = false;

  isGroupTitleHovered = false;
  isAddMembersHovered = false;
  isMobile = false;
  screenWidth = window.innerWidth;

  constructor(
    private groupService: GroupService,
    private mobileService: MobileService
  ) {}

  /**
   * Initializes screen responsiveness by subscribing to MobileService.
   */
  ngOnInit(): void {
    this.mobileService.isMobile$.subscribe((isMobile) => {
      this.isMobile = isMobile;
    });

    this.screenWidth = window.innerWidth;
  }

  /**
   * Updates screen width on browser resize.
   * @param event - Resize event
   */
  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.screenWidth = event.target.innerWidth;
  }

  /** Toggles the group settings modal. */
  toggleGroupSettings() {
    this.showGroupSettingsModal = !this.showGroupSettingsModal;
  }

  /** Closes the group settings modal. */
  closeGroupSettings() {
    this.showGroupSettingsModal = false;
  }

  /** Emits the closedChannel event when settings indicate the chat was closed. */
  onGroupSettingsChannelClosed() {
    this.closedChannel.emit();
  }

  /** Toggles the group members modal. */
  toggleMembers() {
    this.showMembersModal = !this.showMembersModal;
  }

  /** Closes the members modal. */
  closeMembers() {
    this.showMembersModal = false;
  }

  /**
   * Emits when a member is clicked (e.g. to open their profile).
   * @param u - The user that was clicked
   */
  onMemberClicked(u: User) {
    this.memberClicked.emit(u);
  }

  /**
   * Switches from the members modal to the add members modal.
   */
  onAddMembersFromMembers() {
    this.closeMembers();
    this.toggleAddMembers();
  }

  /**
   * Toggles the add members modal and loads users if not already loaded.
   */
  toggleAddMembers() {
    this.showAddMembersModal = !this.showAddMembersModal;

    if (this.showAddMembersModal && this.allUsers.length === 0) {
      this.groupService.getAllUsers().then((users) => {
        this.allUsers = users;
      });
    }
  }

  /** Closes the add members modal and resets search state. */
  closeAddMembers() {
    this.showAddMembersModal = false;
    this.searchTerm = '';
    this.filteredUsers = [];
    this.selectedUsers = [];
  }

  /**
   * Filters available users based on search term, excluding already added and selected users.
   */
  filterUsers() {
    const t = this.searchTerm.trim().toLowerCase();
    if (!t) {
      this.filteredUsers = [];
      return;
    }

    this.filteredUsers = this.allUsers
      .filter((u) => {
        const isCurrent = this.group.participants?.includes(u.uid!);
        const notSelected = !this.selectedUsers.some((s) => s.uid === u.uid);
        const matches = (u.name || u.email || '').toLowerCase().includes(t);
        return !isCurrent && notSelected && matches;
      })
      .slice(0, 5);
  }

  /**
   * Selects a user to be added to the group.
   * @param u - The user to add
   */
  selectUser(u: User) {
    if (!this.selectedUsers.find((s) => s.uid === u.uid)) {
      this.selectedUsers.push(u);
    }
    this.searchTerm = '';
    this.filteredUsers = [];
  }

  /**
   * Removes a user from the selection list.
   * @param u - The user to remove
   */
  removeSelected(u: User) {
    this.selectedUsers = this.selectedUsers.filter((s) => s.uid !== u.uid);
  }

  /**
   * Adds all selected users to the group via the GroupService.
   * Updates the local participants map as well.
   */
  async confirmAdd() {
    if (!this.group.id) return;
    for (const u of this.selectedUsers) {
      await this.groupService.addUserToGroup(this.group.id, u.uid!);
      this.participantsMap[u.uid!] = u;
    }
    this.closeAddMembers();
  }
}
