import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../../auth/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ CommonModule, FormsModule, RouterLink, ReactiveFormsModule ],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss'
})
export class ForgotPasswordComponent {

  resetForm: FormGroup;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  loading = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    this.resetForm = new FormGroup({
      email: new FormControl('', [Validators.required, Validators.email])
    });
  }

  async onSubmit() {
    if (this.resetForm.invalid) {
      return;
    }

    this.loading = true;
    this.errorMessage = null;
    this.successMessage = null;

    const email = this.resetForm.get('email')?.value;

    try {
      await this.authService.sendPasswordResetEmail(email).toPromise();
      this.successMessage = 'Eine E-Mail zum Zurücksetzen des Passworts wurde gesendet. Bitte überprüfen Sie Ihren Posteingang.';
    } catch (error: any) {
      this.errorMessage = error.message || 'Fehler beim Senden der Zurücksetzen-E-Mail.';
    } finally {
      this.loading = false;
    }
  }

}
