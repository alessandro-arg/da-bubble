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
  ) {}

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
      const { user } = await this.authService.login(
        this.credentials.email,
        this.credentials.password
      );
      if (user) {
        const userData = await this.userService.getUser(user.uid);
        this.router.navigate([`/landingpage/${user.uid}`]); // Zum geschützten Bereich
      }
    } catch (error) {
      this.errorMessage = 'Login fehlgeschlagen.';
      console.error('Login error:', error);
    } finally {
      this.loading = false;
    }
  }
}
