/**
 * CreateGroupModalComponent allows users to create a new group by entering a name, description,
 * and optionally selecting specific users (or all users). The component supports two steps:
 * 1) Group info entry and 2) Member selection.
 */

import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GroupService } from '../../../services/group.service';
import { User } from '../../../models/user.model';
import { Auth } from '@angular/fire/auth';
import { Subscription } from 'rxjs';
import {
  PresenceRecord,
  PresenceService,
} from '../../../services/presence.service';
import { MobileService } from '../../../services/mobile.service';

@Component({
  selector: 'app-create-group-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-group-modal.component.html',
  styleUrl: './create-group-modal.component.scss',
})
export class CreateGroupModalComponent implements OnInit {
  @Output() close = new EventEmitter<void>();
  @Output() created = new EventEmitter<string>();

  name = '';
  nameError = '';
  description = '';

  addAll = true;

  allUsers: User[] = [];
  selectedUsers: User[] = [];
  searchTerm = '';
  currentUserUid = '';
  step = 1;

  statusMap: Record<string, boolean> = {};
  private subs: Subscription[] = [];

  isMobile = false;

  constructor(
    private groupService: GroupService,
    private auth: Auth,
    private presence: PresenceService,
    private mobileService: MobileService
  ) {}

  /**
   * Loads all users (excluding self), subscribes to their online status,
   * and detects screen size.
   */
  async ngOnInit() {
    this.mobileService.isMobile$.subscribe((isMobile) => {
      this.isMobile = isMobile;
    });

    const me = this.auth.currentUser;
    this.currentUserUid = me ? me.uid : '';
    const users = await this.groupService.getAllUsers();
    this.allUsers = users.filter((u) => u.uid !== this.currentUserUid);

    this.allUsers.forEach((u) => {
      const sub = this.presence
        .getUserStatus(u.uid!)
        .subscribe((rec: PresenceRecord) => {
          this.statusMap[u.uid!] = rec.state === 'online';
        });
      this.subs.push(sub);
    });
  }

  /**
   * Prevents modal click from closing when clicking inside.
   * @param event MouseEvent
   */
  stopPropagation(event: MouseEvent) {
    event.stopPropagation();
  }

  /**
   * Filters users based on the current search term, excluding already selected users.
   */
  get filteredUsers(): User[] {
    const term = this.searchTerm.toLowerCase().trim();
    if (!term) return [];
    return this.allUsers
      .filter((u) => {
        const parts = u.name.toLowerCase().split(/\s+/);
        const matchesName = parts.some((part) => part.startsWith(term));
        const notSelected = !this.selectedUsers.some((s) => s.uid === u.uid);
        return matchesName && notSelected;
      })
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 5);
  }

  /**
   * Closes the modal and resets its state.
   */
  onClose() {
    this.reset();
    this.step = 1;
    this.close.emit();
  }

  /**
   * Proceeds to step 2 if group name is valid.
   */
  async onCreate() {
    this.nameError = '';
    if (!this.name.trim()) {
      return;
    }

    const exists = await this.groupService.isGroupNameTaken(this.name);
    if (exists) {
      this.nameError = 'Es gibt bereits einen Channel mit diesem Namen';
      return;
    }

    this.step = 2;
  }

  /**
   * Navigates back to the first step of the modal.
   */
  backToStep1() {
    this.step = 1;
  }

  /**
   * Adds a user to the selected list.
   * @param user User to add
   */
  addUser(user: User) {
    this.selectedUsers.push(user);
    this.searchTerm = '';
  }

  /**
   * Removes a user from the selected list.
   * @param user User to remove
   */
  removeUser(user: User) {
    this.selectedUsers = this.selectedUsers.filter((x) => x.uid !== user.uid);
  }

  /**
   * Finalizes the group creation, emits the new group ID, and closes the modal.
   */
  async onFinish() {
    let groupId: string;
    if (this.addAll) {
      groupId = await this.groupService.createGroupWithAllUsers(
        this.name,
        this.description
      );
    } else {
      const uids = this.selectedUsers.map((user) => user.uid);
      groupId = await this.groupService.createGroup(
        this.name,
        this.description,
        uids
      );
    }

    this.created.emit(groupId);
    this.onClose();
  }

  /**
   * Resets form fields and selections.
   */
  private reset() {
    this.name = '';
    this.description = '';
    this.addAll = true;
    this.selectedUsers = [];
    this.searchTerm = '';
  }
}
