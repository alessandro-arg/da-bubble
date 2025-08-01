/**
 * Modal component for viewing and editing a group's settings, including:
 * - group name and description
 * - participant list
 * - adding/removing members
 * - leaving the group
 */

import {
  Component,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GroupService } from '../../services/group.service';
import { Group } from '../../models/group.model';
import { MobileService } from '../../services/mobile.service';
import { GroupMembersModalComponent } from '../group-members-modal/group-members-modal.component';
import { User } from '../../models/user.model';
import { AddMembersModalComponent } from '../add-members-modal/add-members-modal.component';

@Component({
  selector: 'app-group-settings-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    GroupMembersModalComponent,
    AddMembersModalComponent,
  ],
  templateUrl: './group-settings-modal.component.html',
  styleUrl: './group-settings-modal.component.scss',
})
export class GroupSettingsModalComponent {
  @Input() group!: Group;
  @Input() participantsMap: Record<string, User> = {};
  @Input() isCreator = false;
  @Input() currentUserUid!: string | null;

  @Output() close = new EventEmitter<void>();
  @Output() closedChannel = new EventEmitter<void>();
  @Output() memberClicked = new EventEmitter<User>();

  allUsers: User[] = [];
  searchTerm = '';
  filteredUsers: User[] = [];
  selectedUsers: User[] = [];

  editingGroupName = false;
  editingGroupDescription = false;
  newGroupName = '';
  newGroupDescription = '';
  showMembersModal = false;
  showAddMembersModal = false;

  @ViewChild('groupNameInput') groupNameInput!: ElementRef<HTMLInputElement>;
  @ViewChild('groupDescriptionInput')
  groupDescriptionInput!: ElementRef<HTMLInputElement>;

  isMobile = false;

  constructor(
    private groupService: GroupService,
    private mobileService: MobileService
  ) {}

  /**
   * Initializes mobile layout check and form fields.
   */
  ngOnInit() {
    this.mobileService.isMobile$.subscribe((isMobile) => {
      this.isMobile = isMobile;
    });

    this.newGroupName = this.group.name;
    this.newGroupDescription = this.group.description || '';
  }

  /** Emits close event and resets editing states. */
  onClose() {
    this.editingGroupName = this.editingGroupDescription = false;
    this.close.emit();
  }

  /** Emits a user clicked event. */
  onMemberClicked(u: User) {
    this.memberClicked.emit(u);
  }

  /** Closes the members modal. */
  closeMembers() {
    this.showMembersModal = false;
  }

  /** Opens add-members modal from within members modal. */
  onAddMembersFromMembers() {
    this.closeMembers();
    this.toggleAddMembers();
  }

  /** Toggles the add-members modal and fetches users if needed. */
  toggleAddMembers() {
    this.showAddMembersModal = !this.showAddMembersModal;

    if (this.showAddMembersModal && this.allUsers.length === 0) {
      this.groupService.getAllUsers().then((users) => {
        this.allUsers = users;
      });
    }
  }

  /** Closes the add-members modal and clears related state. */
  closeAddMembers() {
    this.showAddMembersModal = false;
    this.searchTerm = '';
    this.filteredUsers = [];
    this.selectedUsers = [];
  }

  /** Filters users based on search input. */
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

  /** Adds a user to the selected list. */
  selectUser(u: User) {
    if (!this.selectedUsers.find((s) => s.uid === u.uid)) {
      this.selectedUsers.push(u);
    }
    this.searchTerm = '';
    this.filteredUsers = [];
  }

  /** Removes a user from the selected list. */
  removeSelected(u: User) {
    this.selectedUsers = this.selectedUsers.filter((s) => s.uid !== u.uid);
  }

  /** Confirms adding selected users to the group. */
  async confirmAdd() {
    if (!this.group.id) return;
    for (const u of this.selectedUsers) {
      await this.groupService.addUserToGroup(this.group.id, u.uid!);
      this.participantsMap[u.uid!] = u;
    }
    this.closeAddMembers();
  }

  /** Starts editing the group name. */
  startEditGroupName() {
    this.editingGroupName = true;
    this.newGroupName = this.group.name;
    setTimeout(() => {
      this.groupNameInput?.nativeElement.focus();
    }, 0);
  }

  /** Cancels editing the group name. */
  cancelEditGroupName() {
    this.editingGroupName = false;
    this.newGroupName = this.group.name;
  }

  /** Saves the updated group name to Firestore. */
  async saveGroupName() {
    await this.groupService.updateGroup(this.group.id, {
      name: this.newGroupName,
    });
    this.editingGroupName = false;
  }

  /** Starts editing the group description. */
  startEditGroupDescription() {
    this.editingGroupDescription = true;
    this.newGroupDescription = this.group.description || '';
    setTimeout(() => {
      this.groupDescriptionInput?.nativeElement.focus();
    }, 0);
  }

  /** Cancels editing the group description. */
  cancelEditGroupDescription() {
    this.editingGroupDescription = false;
    this.newGroupDescription = this.group.description || '';
  }

  /** Saves the updated group description to Firestore. */
  async saveGroupDescription() {
    await this.groupService.updateGroup(this.group.id, {
      description: this.newGroupDescription,
    });
    this.editingGroupDescription = false;
  }

  /** Removes the current user from the group and emits a close signal. */
  async leaveChannel() {
    await this.groupService.removeUserFromGroup(
      this.group.id,
      this.currentUserUid!
    );
    this.onClose();
    this.closedChannel.emit();
  }
}
