import {
  Component,
  Input,
  Output,
  EventEmitter,
  HostListener,
} from '@angular/core';
import { User } from '../../models/user.model';
import { Group } from '../../models/group.model';
import { GroupService } from '../../group.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GroupSettingsModalComponent } from '../group-settings-modal/group-settings-modal.component';
import { GroupMembersModalComponent } from '../group-members-modal/group-members-modal.component';
import { AddMembersModalComponent } from '../add-members-modal/add-members-modal.component';
import { MobileService } from '../../mobile.service';

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

  ngOnInit(): void {
    this.mobileService.isMobile$.subscribe((isMobile) => {
      this.isMobile = isMobile;
    });

    this.screenWidth = window.innerWidth;
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.screenWidth = event.target.innerWidth;
  }

  toggleGroupSettings() {
    this.showGroupSettingsModal = !this.showGroupSettingsModal;
  }

  closeGroupSettings() {
    this.showGroupSettingsModal = false;
  }

  onGroupSettingsChannelClosed() {
    this.closedChannel.emit();
  }

  toggleMembers() {
    this.showMembersModal = !this.showMembersModal;
  }

  closeMembers() {
    this.showMembersModal = false;
  }

  onMemberClicked(u: User) {
    this.memberClicked.emit(u);
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
}
