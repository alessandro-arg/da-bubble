import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../auth/auth.service';
import { UserService } from '../../../../services/user.service';
import { User } from '../../../../models/user.model';
import { RegistrationService } from '../../../../services/registration.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-choose-your-avatar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './choose-your-avatar.component.html',
  styleUrl: './choose-your-avatar.component.scss',
})
export class ChooseYourAvatarComponent implements OnInit {
  avatars = [
    'assets/img/charaters.svg',
    'assets/img/charaters(1).svg',
    'assets/img/charaters(2).svg',
    'assets/img/charaters(3).svg',
    'assets/img/charaters(4).svg',
    'assets/img/charaters(5).svg',
  ];

  selectedAvatar: string = '';
  currentUser: User | null = null;
  loading = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private registrationService: RegistrationService,
    private router: Router
  ) {}

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
    const data = this.registrationService.getRegistrationData();

    if (!data || !this.selectedAvatar) {
      this.errorMessage = 'Bitte vervollständigen Sie Ihre Registrierung.';
      return;
    }

    this.loading = true;
    this.errorMessage = null;
    this.successMessage = null;

    try {
      const { email, password, name } = data;

      const userCredential = await firstValueFrom(
        this.authService.register(email, password)
      );

      await this.userService.createUser({
        uid: userCredential.user?.uid,
        name: name,
        email: email,
        avatar: this.selectedAvatar,
      });

      this.successMessage = 'Konto erfolgreich erstellt!';
      this.registrationService.clear();

      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 1800);
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        this.errorMessage =
          'Diese E-Mail-Adresse ist bereits registriert. Bitte verwenden Sie eine andere E-Mail oder melden Sie sich an.';
      } else if (error.code === 'auth/weak-password') {
        this.errorMessage =
          'Das Passwort ist zu schwach. Bitte wählen Sie ein stärkeres Passwort.';
      } else if (error.code === 'auth/invalid-email') {
        this.errorMessage =
          'Ungültige E-Mail-Adresse. Bitte überprüfen Sie Ihre Eingabe.';
      } else if (error.code === 'auth/operation-not-allowed') {
        this.errorMessage =
          'Registrierung ist derzeit nicht möglich. Bitte versuchen Sie es später erneut.';
      } else {
        this.errorMessage =
          'Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.';
      }
    } finally {
      this.loading = false;
    }
  }
}
