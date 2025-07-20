import { Component, HostListener, ElementRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../auth/auth.service';
import { Router } from '@angular/router';
import { UserService } from '../../user.service';
import { User } from '../../models/user.model';
import { ActivatedRoute } from '@angular/router';
import { SearchbarComponent } from '../../components/searchbar/searchbar.component';
import { UserListComponent } from '../../components/user-list/user-list.component';
import { WorkspaceToggleButtonComponent } from '../../components/workspace-toggle-button/workspace-toggle-button.component';
import { ChatComponent } from '../chat/chat.component';
import { ThreadComponent } from '../thread/thread.component';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SearchbarComponent,
    UserListComponent,
    WorkspaceToggleButtonComponent,
    ChatComponent,
    ThreadComponent,
  ],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.scss',
})
export class LandingPageComponent implements OnInit {
  showDropdown = false;
  showProfileModal = false;

  currentUser: User | null = null;
  isEditingName = false;
  editedName: string = '';
  nameError: string | null = null;

  profileUser: User | null = null;
  selectedUser: User | null = null;
  selectedGroupId: string | null = null;
  currentUserUid: string | null = null;
  currentUserHovered = false;

  threadGroupId: string | null = null;
  threadMessageId: string | null = null;

  isCollapsed = false;
  threadVisible = false;

  newMessageMode = false;

  constructor(
    private authService: AuthService,
    private auth: Auth,
    private userService: UserService,
    private router: Router,
    private route: ActivatedRoute,
    private eRef: ElementRef
  ) {
    this.route.paramMap.subscribe(async (params) => {
      const uid = params.get('uid');
      if (uid) {
        this.currentUser = await this.userService.getUser(uid);
      }
    });
  }

  ngOnInit() {
    onAuthStateChanged(
      this.auth,
      (user) => (this.currentUserUid = user?.uid ?? null)
    );
  }

  openPrivateChat(user: User) {
    this.selectedGroupId = null;
    this.selectedUser = user;
    this.threadGroupId = null;
    this.threadMessageId = null;
    this.threadVisible = false;
    this.newMessageMode = false;
  }

  openProfileModalFromUser(user: User) {
    this.profileUser = user;
    this.showProfileModal = true;
  }

  openGroupChat(groupId: string) {
    this.selectedUser = null;
    this.selectedGroupId = groupId;
    this.threadGroupId = null;
    this.threadMessageId = null;
    this.threadVisible = false;
    this.newMessageMode = false;
  }

  onThreadSelected(ev: { groupId: string; messageId: string }) {
    this.threadGroupId = ev.groupId;
    this.threadMessageId = ev.messageId;
    this.threadVisible = true;
  }

  onCloseThread() {
    this.threadGroupId = null;
    this.threadMessageId = null;
    this.threadVisible = false;
  }

  onChannelClosed() {
    this.selectedGroupId = null;
    this.selectedUser = null;
    this.threadVisible = false;
    this.newMessageMode = false;
  }

  toggleWorkspace() {
    this.isCollapsed = !this.isCollapsed;
  }

  toggleDropdown() {
    this.showDropdown = !this.showDropdown;
  }

  openProfileModal() {
    this.showDropdown = false;
    this.showProfileModal = true;
  }

  closeProfileModal() {
    if (this.isEditingName) {
      this.isEditingName = false;
    }
    this.showProfileModal = false;
    this.showDropdown = true;
  }

  closeModals() {
    this.showDropdown = false;
    this.showProfileModal = false;
  }

  enableEdit() {
    this.editedName = this.currentUser?.name || '';
    this.isEditingName = true;
  }

  validateName() {
    const name = this.editedName.trim();
    const isValid = /^[A-Za-zÄäÖöÜüß]+\s+[A-Za-zÄäÖöÜüß]+$/.test(name);
    this.nameError = isValid ? null : 'Please enter your first and last name';
    return isValid;
  }

  async saveName() {
    if (!this.validateName()) return;

    try {
      if (this.currentUser?.uid) {
        await this.userService.updateUser(this.currentUser.uid, {
          name: this.editedName.trim(),
        });

        this.currentUser.name = this.editedName.trim();
        this.isEditingName = false;
      }
    } catch (error) {
      console.error('Name konnte nicht gespeichert werden:', error);
    }
  }

  async logout() {
    try {
      this.authService.logout();
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  onNewMessage() {
    this.selectedUser = null;
    this.selectedGroupId = null;
    this.newMessageMode = true;
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    if (
      (this.showDropdown || this.showProfileModal) &&
      !this.eRef.nativeElement.contains(event.target)
    ) {
      this.closeModals();
    }
  }
}
