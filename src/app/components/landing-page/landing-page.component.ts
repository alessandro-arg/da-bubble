import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from './../../auth.service';
import { Router } from '@angular/router';
import { UserService } from '../../user.service'; // Falls benötigt für Benutzerdaten
import { User } from '../../models/user.model';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.scss'
})
export class LandingPageComponent {
  currentUser: User | null = null;
  
  constructor(
    private authService: AuthService,
    private router: Router,
    private userService: UserService // Optional für weitere Benutzerdaten
  ) {
    // Aktuellen Benutzer abonnieren
    this.authService.currentUser$.subscribe(async (firebaseUser) => {
      if (firebaseUser) {
        // Hier kannst du weitere Benutzerdaten laden falls benötigt
        this.currentUser = await this.userService.getUser(firebaseUser.uid);
      } else {
        this.currentUser = null;
      }
    });
  }

  async logout() {
    try {
      await this.authService.logout();
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }
}
