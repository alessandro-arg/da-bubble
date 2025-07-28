import {
  Component,
  HostListener,
  ElementRef,
  OnInit,
  ViewChild,
  Inject,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
import { PresenceService } from '../../presence.service';
import { MobileService } from '../../mobile.service';

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
  screenWidth = 0;
  isMobile = false;
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

  private isBrowser: boolean;

  @ViewChild('userListDiv') userListDiv!: ElementRef<HTMLDivElement>;
  @ViewChild('chatListDiv') chatListDiv!: ElementRef<HTMLDivElement>;

  constructor(
    @Inject(PLATFORM_ID) platformId: Object,
    private auth: Auth,
    private userService: UserService,
    private router: Router,
    private route: ActivatedRoute,
    private eRef: ElementRef,
    private presence: PresenceService,
    private mobileService: MobileService
  ) {
    this.isBrowser = isPlatformBrowser(platformId);

    this.route.paramMap.subscribe(async (params) => {
      const uid = params.get('uid');
      if (uid) {
        this.currentUser = await this.userService.getUser(uid);
      }
    });
  }

  ngOnInit() {
    this.mobileService.isMobile$.subscribe((isMobile) => {
      this.isMobile = isMobile;
    });

    onAuthStateChanged(
      this.auth,
      (user) => (this.currentUserUid = user?.uid ?? null)
    );

    if (this.isBrowser) {
      this.screenWidth = window.innerWidth;
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: UIEvent) {
    if (this.isBrowser) {
      this.screenWidth = (event.target as Window).innerWidth;
    }
  }

  openPrivateChat(user: User) {
    this.selectedGroupId = null;
    this.selectedUser = user;
    this.threadGroupId = null;
    this.threadMessageId = null;
    this.threadVisible = false;
    this.newMessageMode = false;

    if (this.isBrowser && this.screenWidth < 1024) {
      this.userListDiv.nativeElement.style.display = 'none';
    }
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

    if (this.isBrowser && this.screenWidth < 1024) {
      this.userListDiv.nativeElement.style.display = 'none';
    }
  }

  onThreadSelected(ev: { groupId: string; messageId: string }) {
    this.threadGroupId = ev.groupId;
    this.threadMessageId = ev.messageId;
    this.threadVisible = true;

    if (this.isBrowser && this.screenWidth < 1024) {
      this.chatListDiv.nativeElement.style.display = 'none';
    }
  }

  onCloseThread() {
    this.threadGroupId = null;
    this.threadMessageId = null;
    this.threadVisible = false;

    if (this.isBrowser && this.screenWidth < 1024) {
      this.chatListDiv.nativeElement.style.display = 'flex';
    }
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
      if (this.currentUserUid) {
        await this.presence.forceOffline(this.currentUserUid);
      }
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

  goBackMobile() {
    this.selectedUser = null;
    this.selectedGroupId = null;
    this.newMessageMode = false;
    this.threadVisible = false;
  }
}
