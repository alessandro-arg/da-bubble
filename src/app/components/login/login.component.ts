import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { UserService } from '../../services/user.service';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  showPassword = false;
  errorMessage: string | null = null;
  loading = false;

  credentials = {
    email: '',
    password: '',
  };

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private router: Router
  ) {}

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  async onSubmit(form: NgForm) {
    if (form.invalid) return;

    this.loading = true;
    this.errorMessage = null;

    try {
      const userCredential = await this.authService
        .login(this.credentials.email, this.credentials.password)
        .toPromise();

      if (userCredential?.user) {
        const userData = await this.userService.getUser(
          userCredential.user.uid
        );
        const redirectUrl =
          this.authService.redirectUrl ||
          `/landingpage/${userCredential.user.uid}`;
        this.router.navigateByUrl(redirectUrl);
      }
    } catch (error: any) {
      this.errorMessage = error.message || 'Login fehlgeschlagen.';
      console.error('Login error:', error);
    } finally {
      this.loading = false;
    }
  }

  async loginWithGoogle() {
    this.loading = true;
    this.errorMessage = null;

    try {
      const result = await this.authService.loginWithGoogle().toPromise();
      if (result?.user) {
        const userExists = await this.userService.getUser(result.user.uid);

        if (!userExists) {
          await this.userService.createUser({
            uid: result.user.uid,
            name: result.user.displayName || 'Google User',
            email: result.user.email || '',
            avatar: result.user.photoURL || 'assets/img/avater.png',
          });
        }

        // Prüfe ob es eine redirectUrl gibt
        const redirectUrl =
          this.authService.redirectUrl || `/landingpage/${result.user.uid}`;
        this.router.navigateByUrl(redirectUrl);
      }
    } catch (error: any) {
      console.error('Google login error:', error);
      this.errorMessage = error.message || 'Google-Anmeldung fehlgeschlagen.';
    } finally {
      this.loading = false;
      setTimeout(() => {
        window.location.reload(); // Optional: Seite neu laden, um UI zu aktualisieren
      }, 10); // Optional: Verzögerung für bessere UX
    }
  }

  async guestLogin() {
    this.loading = true;
    this.errorMessage = null;

    try {
      // 1. Anmeldung als Gast
      const userCredential = await firstValueFrom(
        this.authService.guestLogin()
      );

      // 2. Zufälligen Gastnamen generieren
      const guestName = this.authService.generateRandomGuestName();

      // 3. Zufälligen Avatar auswählen
      const randomAvatar = this.getRandomAvatar();

      // 4. Gast-Benutzer in Firestore erstellen/aktualisieren
      const userData = {
        uid: userCredential.user.uid,
        name: guestName,
        email: environment.guestEmail,
        avatar: randomAvatar,
        isGuest: true,
        createdAt: new Date(),
        displayName: guestName,
        photoURL: randomAvatar,
      };

      await this.userService.createUser(userData);

      // 5. Weiterleitung mit Gast-spezifischer Route
      const redirectUrl =
        this.authService.redirectUrl ||
        `/landingpage/${userCredential.user.uid}`;
      this.router.navigateByUrl(redirectUrl);
    } catch (error: any) {
      console.error('Guest login error:', error);
      this.errorMessage = error.message || 'Gast-Login fehlgeschlagen.';
    } finally {
      this.loading = false;
    }
  }

  getRandomAvatar(): string {
    const avatars = [
      'assets/img/charaters.svg',
      'assets/img/charaters(1).svg',
      'assets/img/charaters(2).svg',
      'assets/img/charaters(3).svg',
      'assets/img/charaters(4).svg',
      'assets/img/charaters(5).svg',
    ];
    return avatars[Math.floor(Math.random() * avatars.length)];
  }
}
