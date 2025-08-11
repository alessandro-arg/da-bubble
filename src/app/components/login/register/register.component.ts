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
import { MobileService } from '../../../services/mobile.service';
import { UserService } from '../../../services/user.service';

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
  isMobile = false;
  arrowHover = false;

  /**
   * Constructs the RegisterComponent and initializes the form.
   * @param registrationService Service to temporarily store registration data.
   * @param router Angular Router to navigate to the next registration step.
   */
  constructor(
    private registrationService: RegistrationService,
    private router: Router,
    private mobileService: MobileService,
    private userService: UserService
  ) {
    this.registerForm = new FormGroup({
      name: new FormControl('', [
        Validators.required,
        Validators.pattern(
          '^[A-Za-zÄÖÜäöüß]{2,12}(?:\\s+[A-Za-zÄÖÜäöüß]{2,12})+$'
        ),
      ]),
      email: new FormControl('', [
        Validators.required,
        Validators.email,
        Validators.pattern('[^@]+@[^@]+\\.[a-zA-Z]{2,6}'),
      ]),
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
    this.mobileService.isMobile$.subscribe((isMobile) => {
      this.isMobile = isMobile;
    });

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
    this.loading = true;
    const { name, email, password, privacyPolicy } = this.registerForm.value;
    try {
      this.registrationService.setRegistrationData({
        name,
        email,
        password,
        privacyPolicy,
      });
      this.router.navigate(['/choose-your-avatar']);
    } catch (err) {
      this.errorMessage = 'Unexpected error. Please try again.';
    } finally {
      this.loading = false;
    }
  }
}
