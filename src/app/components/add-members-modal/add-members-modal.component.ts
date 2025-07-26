import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GroupService } from '../../group.service';
import { User } from '../../models/user.model';
import { PresenceService, PresenceRecord } from '../../presence.service';
import { Subscription } from 'rxjs';
import { MobileService } from '../../mobile.service';

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

  onClose() {
    this.close.emit();
  }

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

  selectUser(u: User) {
    if (!this.selectedUsers.find((x) => x.uid === u.uid)) {
      this.selectedUsers.push(u);
    }
    this.searchTerm = '';
    this.filteredUsers = [];
  }

  removeSelected(u: User) {
    this.selectedUsers = this.selectedUsers.filter((x) => x.uid !== u.uid);
  }

  async confirmAdd() {
    if (!this.groupId) return;
    for (const u of this.selectedUsers) {
      await this.groupService.addUserToGroup(this.groupId, u.uid!);
    }
    this.added.emit();
    this.onClose();
  }
}
