import { Component, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../auth/auth.service';
import { Router } from '@angular/router';
import { UserService } from '../../user.service';
import { User } from '../../models/user.model';
import { ActivatedRoute } from '@angular/router';
import { SearchbarComponent } from '../../components/searchbar/searchbar.component';
import { UserListComponent } from '../../components/user-list/user-list.component';
import { WorkspaceToggleButtonComponent } from '../../components/workspace-toggle-button/workspace-toggle-button.component';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [
    CommonModule,
    SearchbarComponent,
    UserListComponent,
    WorkspaceToggleButtonComponent,
  ],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.scss',
})
export class LandingPageComponent {
  currentUser: User | null = null;
  showDropdown = false;
  showProfileModal = false;

  constructor(
    private authService: AuthService,
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

  toggleDropdown() {
    this.showDropdown = !this.showDropdown;
  }

  openProfileModal() {
    this.showDropdown = false;
    this.showProfileModal = true;
  }

  closeModals() {
    this.showDropdown = false;
    this.showProfileModal = false;
  }

  async logout() {
    try {
      await this.authService.logout();
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Logout error:', error);
    }
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
