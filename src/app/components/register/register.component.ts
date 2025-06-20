import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../auth/auth.service'; // Du musst diesen Service noch erstellen
import { UserService } from '../../user.service'; // Du musst diesen Service noch erstellen

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ReactiveFormsModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
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
      password: new FormControl('', [Validators.required, Validators.minLength(6)]),
      privacyPolicy: new FormControl(false, [Validators.requiredTrue])
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
      // Benutzer registrieren
      const userCredential = await this.authService.register(email, password);
      
      // Benutzerdaten in Firestore speichern
      await this.userService.createUser({
        uid: userCredential.user?.uid,
        name: name,
        email: email,
        avatar: 'default-avatar' // Standard-Avatar
      });

      // Weiter zur Avatar-Auswahl
      this.router.navigate(['/choose-your-avatar']);
    } catch (error) {
      console.error('Registration error:', error);
      this.errorMessage = 'Registrierung fehlgeschlagen. Bitte versuchen Sie es erneut.';
      if (error instanceof Error) {
        this.errorMessage = error.message;
      }
    } finally {
      this.loading = false;
    }
  }
}

/* Kannst mir jetzt den html mit 
ng FormsModule an passenden machen bitte damit es jetzt funktioniert bitte
 machen wir jetzt Einzel component bitte zu erst RegisterComponent.   hier */