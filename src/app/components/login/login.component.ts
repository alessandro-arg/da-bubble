/**
 * LoginComponent provides authentication functionality for registered users,
 * Google sign-in users, and guest users.
 */

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { UserService } from '../../services/user.service';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MobileService } from '../../services/mobile.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnInit {
  showPassword = false;
  errorMessage: string | null = null;
  loading = false;
  isMobile = false;

  credentials = {
    email: '',
    password: '',
  };

  /**
   * Constructor that injects required services.
   * @param authService Service for authentication logic.
   * @param userService Service for fetching or creating user data in Firestore.
   * @param router Angular router for navigation.
   */
  constructor(
    private authService: AuthService,
    private userService: UserService,
    private router: Router,
    private mobileService: MobileService
  ) {}

  ngOnInit() {
    this.mobileService.isMobile$.subscribe((isMobile) => {
      this.isMobile = isMobile;
    });
  }

  /** Toggles visibility of the password input field. */
  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  /**
   * Handles standard email/password login.
   * On success, user is redirected to their landing page.
   * @param form Angular template-driven form for login input.
   */
  async onSubmit(form: NgForm) {
    const emailCtrl = form.form.controls['email'];
    const pwCtrl = form.form.controls['password'];

    emailCtrl.setErrors(null);
    pwCtrl.setErrors(null);

    if (form.invalid) return;

    this.loading = true;
    this.errorMessage = null;

    const exists = await this.userService.isEmailTaken(this.credentials.email);
    if (!exists) {
      emailCtrl.setErrors({ userNotFound: true });
      emailCtrl.markAsTouched();
      this.loading = false;
      return;
    }

    try {
      await firstValueFrom(
        this.authService.login(
          this.credentials.email,
          this.credentials.password
        )
      );
      const redirectUrl =
        this.authService.redirectUrl ||
        `/landingpage/${this.authService.currentUserSubject.value?.uid}`;
      this.router.navigateByUrl(redirectUrl);
    } catch {
      pwCtrl.setErrors({ incorrect: true });
      pwCtrl.markAsTouched();
    } finally {
      this.loading = false;
    }
  }

  /**
   * Handles login using Google OAuth.
   * If user doesn't exist in Firestore, a new one is created.
   * On success, user is redirected to their landing page.
   */
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
        window.location.reload();
      }, 10);
    }
  }

  /**
   * Handles anonymous (guest) login. A guest user is created in Firestore with
   * a random avatar and name.
   * On success, user is redirected to their landing page.
   */
  async guestLogin() {
    this.loading = true;
    this.errorMessage = null;

    try {
      const userCredential = await firstValueFrom(
        this.authService.guestLogin()
      );
      const guestName = this.authService.generateRandomGuestName();
      const randomAvatar = this.getRandomAvatar();
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

  /**
   * Selects a random avatar URL from a predefined list.
   * @returns A string representing the avatar image path.
   */
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
