/**
 * Component for handling password reset requests.
 * Displays a form where users can input their email to receive
 * a password reset link.
 */

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import {
  FormsModule,
  ReactiveFormsModule,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { AuthService } from '../../../auth/auth.service';
import { MobileService } from '../../../services/mobile.service';
import { UserService } from '../../../services/user.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ReactiveFormsModule],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss',
})
export class ForgotPasswordComponent implements OnInit {
  resetForm: FormGroup;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  loading = false;
  isMobile = false;
  arrowHover = false;

  /**
   * Constructs the ForgotPasswordComponent and initializes the form.
   * @param authService Service for authentication-related operations.
   * @param router Angular Router to navigate after successful reset.
   */
  constructor(
    private authService: AuthService,
    private router: Router,
    private mobileService: MobileService,
    private userService: UserService
  ) {
    this.resetForm = new FormGroup({
      email: new FormControl('', [
        Validators.required,
        Validators.email,
        Validators.pattern('[^@]+@[^@]+\\.[a-zA-Z]{2,6}'),
      ]),
    });
  }

  ngOnInit() {
    this.mobileService.isMobile$.subscribe((isMobile) => {
      this.isMobile = isMobile;
    });
  }

  /**
   * Handles form submission.
   * Sends password reset email and handles UI feedback.
   */
  async onSubmit() {
    const emailCtrl = this.resetForm.get('email')!;
    if (emailCtrl.hasError('emailNotFound')) {
      emailCtrl.setErrors(null);
    }
    if (this.resetForm.invalid) {
      return;
    }

    this.loading = true;
    this.errorMessage = null;
    this.successMessage = null;
    const email = emailCtrl.value;

    const exists = await this.userService.isEmailTaken(email);
    if (!exists) {
      emailCtrl.setErrors({ emailNotFound: true });
      emailCtrl.markAsTouched();
      this.loading = false;
      return;
    }

    try {
      await this.authService.sendPasswordResetEmail(email).toPromise();
      this.successMessage = 'E-Mail gesendet.';
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 3000);
    } catch (error: any) {
      this.errorMessage =
        error.message || 'Fehler beim Senden der Zurücksetzen-E-Mail.';
    } finally {
      this.loading = false;
    }
  }
}
