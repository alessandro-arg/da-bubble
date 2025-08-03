/**
 * Component responsible for resetting a user's password.
 * Validates the password reset code from the URL and handles password update.
 */

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import {
  FormsModule,
  ReactiveFormsModule,
  FormControl,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';
import { AuthService } from '../../../auth/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ReactiveFormsModule],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss',
})
export class ResetPasswordComponent implements OnInit {
  resetForm: FormGroup;
  showPassword = false;
  showConfirmPassword = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  loading = false;
  oobCode: string | null = null;

  /**
   * Constructor injecting dependencies and setting up form and query param handling.
   * @param authService Service handling Firebase auth interactions.
   * @param router Angular router for navigation.
   * @param route ActivatedRoute to extract query parameters.
   */
  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.resetForm = new FormGroup(
      {
        password: new FormControl('', [
          Validators.required,
          Validators.minLength(6),
        ]),
        confirmPassword: new FormControl('', [Validators.required]),
      },
      { validators: this.passwordMatchValidator() }
    );

    this.route.queryParams.subscribe((params) => {
      this.oobCode = params['oobCode'] || null;
      if (!this.oobCode) {
        this.errorMessage = 'Ungültiger oder fehlender Zurücksetzen-Code.';
      }
    });
  }

  /**
   * Lifecycle hook that validates the reset password mode and code from URL params.
   */
  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      this.oobCode = params['oobCode'] || null;
      const mode = params['mode'];

      if (mode === 'resetPassword' && this.oobCode) {
      } else {
        this.errorMessage = 'Ungültiger oder fehlender Zurücksetzen-Link.';
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 3000);
      }
    });
  }

  /**
   * Custom validator to ensure that password and confirm password fields match.
   * @returns A ValidatorFn returning mismatch error if passwords don't match.
   */
  passwordMatchValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const formGroup = control as FormGroup;
      const password = formGroup.get('password')?.value;
      const confirmPassword = formGroup.get('confirmPassword')?.value;
      return password === confirmPassword ? null : { mismatch: true };
    };
  }

  /** Toggles the visibility of the password input field. */
  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  /** Toggles the visibility of the confirm password input field. */
  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  /**
   * Submits the form to reset the password using the provided reset code.
   * On success, displays a message and redirects to login page.
   */
  async onSubmit() {
    if (this.resetForm.invalid || !this.oobCode) {
      return;
    }

    this.loading = true;
    this.errorMessage = null;
    this.successMessage = null;

    const newPassword = this.resetForm.get('password')?.value;

    try {
      await this.authService
        .confirmPasswordReset(this.oobCode, newPassword)
        .toPromise();
      this.successMessage = 'Anmelden';
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 3000);
    } catch (error: any) {
      this.errorMessage =
        error.message || 'Fehler beim Zurücksetzen des Passworts.';
    } finally {
      this.loading = false;
    }
  }
}
