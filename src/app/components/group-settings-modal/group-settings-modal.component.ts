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
import { GroupService } from '../../group.service';
import { Group } from '../../models/group.model';
import { MobileService } from '../../mobile.service';
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

  ngOnInit() {
    this.mobileService.isMobile$.subscribe((isMobile) => {
      this.isMobile = isMobile;
    });

    this.newGroupName = this.group.name;
    this.newGroupDescription = this.group.description || '';
  }

  onClose() {
    this.editingGroupName = this.editingGroupDescription = false;
    this.close.emit();
  }

  onMemberClicked(u: User) {
    this.memberClicked.emit(u);
  }

  closeMembers() {
    this.showMembersModal = false;
  }

  onAddMembersFromMembers() {
    this.closeMembers();
    this.toggleAddMembers();
  }

  toggleAddMembers() {
    this.showAddMembersModal = !this.showAddMembersModal;

    if (this.showAddMembersModal && this.allUsers.length === 0) {
      this.groupService.getAllUsers().then((users) => {
        this.allUsers = users;
      });
    }
  }

  closeAddMembers() {
    this.showAddMembersModal = false;
    this.searchTerm = '';
    this.filteredUsers = [];
    this.selectedUsers = [];
  }

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

  selectUser(u: User) {
    if (!this.selectedUsers.find((s) => s.uid === u.uid)) {
      this.selectedUsers.push(u);
    }
    this.searchTerm = '';
    this.filteredUsers = [];
  }

  removeSelected(u: User) {
    this.selectedUsers = this.selectedUsers.filter((s) => s.uid !== u.uid);
  }

  async confirmAdd() {
    if (!this.group.id) return;
    for (const u of this.selectedUsers) {
      await this.groupService.addUserToGroup(this.group.id, u.uid!);
      this.participantsMap[u.uid!] = u;
    }
    this.closeAddMembers();
  }

  startEditGroupName() {
    this.editingGroupName = true;
    this.newGroupName = this.group.name;
    setTimeout(() => {
      this.groupNameInput?.nativeElement.focus();
    }, 0);
  }

  cancelEditGroupName() {
    this.editingGroupName = false;
    this.newGroupName = this.group.name;
  }

  async saveGroupName() {
    await this.groupService.updateGroup(this.group.id, {
      name: this.newGroupName,
    });
    this.editingGroupName = false;
  }

  startEditGroupDescription() {
    this.editingGroupDescription = true;
    this.newGroupDescription = this.group.description || '';
    setTimeout(() => {
      this.groupDescriptionInput?.nativeElement.focus();
    }, 0);
  }

  cancelEditGroupDescription() {
    this.editingGroupDescription = false;
    this.newGroupDescription = this.group.description || '';
  }

  async saveGroupDescription() {
    await this.groupService.updateGroup(this.group.id, {
      description: this.newGroupDescription,
    });
    this.editingGroupDescription = false;
  }

  async leaveChannel() {
    await this.groupService.removeUserFromGroup(
      this.group.id,
      this.currentUserUid!
    );
    this.onClose();
    this.closedChannel.emit();
  }
}
