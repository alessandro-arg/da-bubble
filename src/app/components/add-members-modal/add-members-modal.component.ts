/**
 * AddMembersModalComponent provides a modal interface for adding users to a group.
 * It includes search functionality, real-time presence status display, and mobile responsiveness.
 */

import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GroupService } from '../../services/group.service';
import { User } from '../../models/user.model';
import {
  PresenceService,
  PresenceRecord,
} from '../../services/presence.service';
import { Subscription } from 'rxjs';
import { MobileService } from '../../services/mobile.service';

@Component({
  selector: 'app-add-members-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-members-modal.component.html',
  styleUrls: ['./add-members-modal.component.scss'],
})
export class AddMembersModalComponent implements OnInit {
  @Input() groupId!: string;
  @Input() groupName!: string;
  @Input() currentParticipants: string[] = [];

  @Output() close = new EventEmitter<void>();
  @Output() added = new EventEmitter<void>();

  allUsers: User[] = [];
  filteredUsers: User[] = [];
  selectedUsers: User[] = [];
  searchTerm = '';

  statusMap: Record<string, boolean> = {};
  private subs: Subscription[] = [];

  isMobile = false;

  constructor(
    private groupService: GroupService,
    private presence: PresenceService,
    private mobileService: MobileService
  ) {}

  /**
   * Initializes the component:
   * - Subscribes to mobile screen size
   * - Loads all users
   * - Subscribes to their presence status
   */
  ngOnInit() {
    this.mobileService.isMobile$.subscribe((isMobile) => {
      this.isMobile = isMobile;
    });

    this.groupService.getAllUsers().then((users) => {
      this.allUsers = users;

      users.forEach((u) => {
        const sub = this.presence
          .getUserStatus(u.uid!)
          .subscribe((rec: PresenceRecord) => {
            this.statusMap[u.uid!] = rec.state === 'online';
          });
        this.subs.push(sub);
      });
    });
  }

  /**
   * Emits the close event to signal the modal should be closed.
   */
  onClose() {
    this.close.emit();
  }

  /**
   * Filters users based on the current search term, excluding:
   * - Already in the group
   * - Already selected for adding
   * - Not matching the term in name or email
   */
  filterUsers() {
    const t = this.searchTerm.trim().toLowerCase();
    if (!t) {
      this.filteredUsers = [];
      return;
    }

    this.filteredUsers = this.allUsers
      .filter((u) => {
        const isCurrent = this.currentParticipants.includes(u.uid!);
        const notSelected = !this.selectedUsers.some((x) => x.uid === u.uid);
        const matches = (u.name || u.email || '').toLowerCase().includes(t);
        return !isCurrent && notSelected && matches;
      })
      .slice(0, 5);
  }

  /**
   * Adds a user to the selection list when clicked.
   * @param u - The user to add
   */
  selectUser(u: User) {
    if (!this.selectedUsers.find((x) => x.uid === u.uid)) {
      this.selectedUsers.push(u);
    }
    this.searchTerm = '';
    this.filteredUsers = [];
  }

  /**
   * Removes a user from the selected list.
   * @param u - The user to remove
   */
  removeSelected(u: User) {
    this.selectedUsers = this.selectedUsers.filter((x) => x.uid !== u.uid);
  }

  /**
   * Confirms the selection and adds each selected user to the group.
   * Emits the `added` event and closes the modal.
   */
  async confirmAdd() {
    if (!this.groupId) return;
    for (const u of this.selectedUsers) {
      await this.groupService.addUserToGroup(this.groupId, u.uid!);
    }
    this.added.emit();
    this.onClose();
  }
}
