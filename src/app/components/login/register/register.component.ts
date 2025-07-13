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
import { RegistrationService } from '../../../registration.service';

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

  ngOnInit() {
    const savedData = this.registrationService.getRegistrationData();
    if (savedData) {
      this.registerForm.setValue({
        name: savedData.name,
        email: savedData.email,
        password: savedData.password,
        privacyPolicy: savedData.privacyPolicy
      });
    }
  }
  

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  // Füge diese Methode zur Klasse hinzu
  togglePrivacyPolicy() {
    const currentValue = this.registerForm.get('privacyPolicy')?.value;
    this.registerForm.get('privacyPolicy')?.setValue(!currentValue);
    this.registerForm.get('privacyPolicy')?.markAsTouched();
  }

  async onSubmit() {
    if (this.registerForm.invalid) return;

    const { name, email, password, privacyPolicy } = this.registerForm.value;

    // Temporär speichern
    this.registrationService.setRegistrationData({ name, email, password, privacyPolicy });

    this.router.navigate(['/choose-your-avatar']);
  }
  
}
