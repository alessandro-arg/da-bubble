import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../auth/auth.service';
import { UserService } from '../../../../user.service';
import { User } from '../../../../models/user.model';

@Component({
  selector: 'app-choose-your-avatar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './choose-your-avatar.component.html',
  styleUrl: './choose-your-avatar.component.scss'
})
export class ChooseYourAvatarComponent implements OnInit {
  avatars = [
    'assets/img/charaters.svg',
    'assets/img/charaters(1).svg',
    'assets/img/charaters(2).svg',
    'assets/img/charaters(3).svg',
    'assets/img/charaters(4).svg',
    'assets/img/charaters(5).svg'
  ];

  selectedAvatar: string = '';
  currentUser: User | null = null;
  loading = false;
  successMessage: string | null = null;

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private router: Router
  ) { }

  async ngOnInit() {
    this.authService.currentUser$.subscribe(async (firebaseUser) => {
      if (firebaseUser) {
        this.currentUser = await this.userService.getUser(firebaseUser.uid);
        if (this.currentUser?.isGuest) {
          this.selectedAvatar = this.currentUser.avatar;
          this.confirmAvatar();
        }
      }
    });
  }

  selectAvatar(avatar: string) {
    this.selectedAvatar = avatar;
  }

  async confirmAvatar() {
    if (!this.selectedAvatar || !this.currentUser?.uid) {
      alert('Bitte wählen Sie einen Avatar aus');
      return;
    }
    this.loading = true;
    try {
      const updateData = {
        avatar: this.selectedAvatar,
        lastUpdated: new Date()
      };
      await this.userService.updateUser(this.currentUser.uid, updateData);
      this.currentUser = {
        ...this.currentUser,
        ...updateData
      };
      this.successMessage = 'Konto erfolgreich erstellt!';
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 1800);

    } catch (error) {
      console.error('Avatar Update Error:', error);
      alert(`Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    } finally {
      this.loading = false;
    }
  }
}
