import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GroupService } from '../../../group.service';
import { User } from '../../../models/user.model';
import { Auth } from '@angular/fire/auth';
import { Subscription } from 'rxjs';
import { PresenceRecord, PresenceService } from '../../../presence.service';
import { MobileService } from '../../../mobile.service';

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

  stopPropagation(event: MouseEvent) {
    event.stopPropagation();
  }

  get filteredUsers(): User[] {
    const term = this.searchTerm.toLowerCase().trim();
    if (!term) return [];
    return this.allUsers
      .filter(
        (u) =>
          u.name.toLowerCase().includes(term) &&
          !this.selectedUsers.find((s) => s.uid === u.uid)
      )
      .slice(0, 5);
  }

  onClose() {
    this.reset();
    this.step = 1;
    this.close.emit();
  }

  onCreate() {
    if (!this.name.trim()) {
      return;
    }
    this.step = 2;
  }

  backToStep1() {
    this.step = 1;
  }

  addUser(user: User) {
    this.selectedUsers.push(user);
    this.searchTerm = '';
  }

  removeUser(user: User) {
    this.selectedUsers = this.selectedUsers.filter((x) => x.uid !== user.uid);
  }

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

  private reset() {
    this.name = '';
    this.description = '';
    this.addAll = true;
    this.selectedUsers = [];
    this.searchTerm = '';
  }
}
