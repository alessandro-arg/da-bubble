/**
 * Component for handling user registration.
 * Collects user details and stores them temporarily for use in subsequent steps.
 */

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  ReactiveFormsModule,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { RegistrationService } from '../../../services/registration.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ReactiveFormsModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent {
  registerForm: FormGroup;
  showPassword = false;
  errorMessage: string | null = null;
  loading = false;

  /**
   * Constructs the RegisterComponent and initializes the form.
   * @param registrationService Service to temporarily store registration data.
   * @param router Angular Router to navigate to the next registration step.
   */
  constructor(
    private registrationService: RegistrationService,
    private router: Router
  ) {
    this.registerForm = new FormGroup({
      name: new FormControl('', [Validators.required]),
      email: new FormControl('', [Validators.required, Validators.email]),
      password: new FormControl('', [
        Validators.required,
        Validators.minLength(6),
      ]),
      privacyPolicy: new FormControl(false, [Validators.requiredTrue]),
    });
  }

  /**
   * Loads previously entered registration data if available.
   */
  ngOnInit() {
    const savedData = this.registrationService.getRegistrationData();
    if (savedData) {
      this.registerForm.setValue({
        name: savedData.name,
        email: savedData.email,
        password: savedData.password,
        privacyPolicy: savedData.privacyPolicy,
      });
    }
  }

  /**
   * Toggles the visibility of the password input field.
   */
  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  /**
   * Manually toggles the privacy policy checkbox and marks it as touched.
   */
  togglePrivacyPolicy() {
    const currentValue = this.registerForm.get('privacyPolicy')?.value;
    this.registerForm.get('privacyPolicy')?.setValue(!currentValue);
    this.registerForm.get('privacyPolicy')?.markAsTouched();
  }

  /**
   * Handles form submission.
   * Stores registration data and navigates to the avatar selection step.
   */
  async onSubmit() {
    if (this.registerForm.invalid) return;
    const { name, email, password, privacyPolicy } = this.registerForm.value;
    this.registrationService.setRegistrationData({
      name,
      email,
      password,
      privacyPolicy,
    });
    this.router.navigate(['/choose-your-avatar']);
  }
}
