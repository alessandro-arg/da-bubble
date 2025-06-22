import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { UserService } from '../../user.service';

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
  ) { }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  async guestLogin() {
    this.loading = true;
    try {
      await this.authService.login('guest@example.com', 'guestpassword');
      this.router.navigate(['/AppComponent']);
    } catch (error) {
      console.error('Guest login error:', error);
      this.errorMessage = 'Gast-Login fehlgeschlagen.';
    } finally {
      this.loading = false;
    }
  }

  async onSubmit(form: NgForm) {
    if (form.invalid) return;

    this.loading = true;
    this.errorMessage = null;

    try {
      const userCredential = await this.authService.login(
        this.credentials.email,
        this.credentials.password
      ).toPromise();

      if (userCredential?.user) {
        const userData = await this.userService.getUser(userCredential.user.uid);
        const redirectUrl = this.authService.redirectUrl || `/landingpage/${userCredential.user.uid}`;
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
            avatar: result.user.photoURL || 'assets/img/profile.svg'
          });
        }

        // Prüfe ob es eine redirectUrl gibt
        const redirectUrl = this.authService.redirectUrl || `/landingpage/${result.user.uid}`;
        this.router.navigateByUrl(redirectUrl);
      }
    } catch (error: any) {
      console.error('Google login error:', error);
      this.errorMessage = error.message || 'Google-Anmeldung fehlgeschlagen.';
    } finally {
      this.loading = false;
    }
  }

}
