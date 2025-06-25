import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
import {
  ReactiveFormsModule,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { AuthService } from '../../../auth/auth.service';
import { firstValueFrom } from 'rxjs';
import { UserService } from '../../../user.service';

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

  constructor(
    private authService: AuthService,
    private userService: UserService,
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

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  async onSubmit() {
    if (this.registerForm.invalid) {
      return;
    }

    this.loading = true;
    this.errorMessage = null;

    const { name, email, password } = this.registerForm.value;

    try {
      const userCredential = await firstValueFrom(
        this.authService.register(email, password)
      );

      await this.userService.createUser({
        uid: userCredential.user?.uid,
        name: name,
        email: email,
        avatar: 'assets/img/charaters.svg', // Default avatar
      });

      this.router.navigate(['/choose-your-avatar']);
    } catch (error) {
      console.error('Registration error:', error);
      this.errorMessage =
        'Registrierung fehlgeschlagen. Bitte versuchen Sie es erneut.';
      if (error instanceof Error) {
        this.errorMessage = error.message;
      }
    } finally {
      this.loading = false;
    }
  }
}
