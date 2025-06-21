import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../auth/auth.service';
import { Router } from '@angular/router';
import { UserService } from '../../user.service';
import { User } from '../../models/user.model';
import { SearchbarComponent } from '../../components/searchbar/searchbar.component';
import { UserListComponent } from '../../components/user-list/user-list.component';
import { WorkspaceToggleButtonComponent } from '../../components/workspace-toggle-button/workspace-toggle-button.component';


@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [CommonModule, SearchbarComponent, UserListComponent, WorkspaceToggleButtonComponent],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.scss'
})
export class LandingPageComponent {
  currentUser: User | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private userService: UserService
  ) {
    this.authService.currentUser$.subscribe(async (firebaseUser) => {
      if (firebaseUser) {
        this.currentUser = await this.userService.getUser(firebaseUser.uid);
      } else {
        this.currentUser = null;
      }
    });
  }

  async logout() {
    try {
      await this.authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  }
}
