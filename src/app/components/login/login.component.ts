import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from './../../auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  showPassword = false;
  errorMessage: string | null = null;
  loading = false;

  credentials = {
    email: '',
    password: ''
  };

  constructor(
    private authService: AuthService,
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
      await this.authService.login(this.credentials.email, this.credentials.password);
      this.router.navigate(['/landingpage']); // Zum geschützten Bereich
    } catch (error) {
      this.errorMessage = 'Login fehlgeschlagen.';
    } finally {
      this.loading = false;
    }
  }
}
