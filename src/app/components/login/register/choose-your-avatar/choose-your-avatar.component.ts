import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../auth/auth.service';
import { UserService } from '../../../../services/user.service';
import { User } from '../../../../models/user.model';
import { RegistrationService } from '../../../../services/registration.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-choose-your-avatar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './choose-your-avatar.component.html',
  styleUrl: './choose-your-avatar.component.scss',
})
export class ChooseYourAvatarComponent implements OnInit {
  avatars = this.getAvatarPaths();
  selectedAvatar: string = '';
  currentUser: User | null = null;
  loading = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;
  avatarSelectedConfirmed = false;

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private registrationService: RegistrationService,
    private router: Router
  ) { }

  ngOnInit() {
    this.subscribeToCurrentUser();
  }

  private getAvatarPaths(): string[] {
    return [
      'assets/img/charaters.svg',
      'assets/img/charaters(1).svg',
      'assets/img/charaters(2).svg',
      'assets/img/charaters(3).svg',
      'assets/img/charaters(4).svg',
      'assets/img/charaters(5).svg',
    ];
  }

  private subscribeToCurrentUser(): void {
    this.authService.currentUser$.subscribe(async (firebaseUser) => {
      if (firebaseUser) {
        await this.handleFirebaseUser(firebaseUser);
      }
    });
  }

  private async handleFirebaseUser(firebaseUser: any): Promise<void> {
    this.currentUser = await this.getUser(firebaseUser.uid);
    this.handleGuestUser();
  }

  private async getUser(uid: string): Promise<User | null> {
    return await this.userService.getUser(uid);
  }

  private handleGuestUser(): void {
    if (this.currentUser?.isGuest) {
      this.setGuestAvatar();
      this.confirmAvatar();
    }
  }

  private setGuestAvatar(): void {
    if (this.currentUser) {
      this.selectedAvatar = this.currentUser.avatar;
    }
  }

  selectAvatar(avatar: string): void {
    this.selectedAvatar = avatar;
    this.avatarSelectedConfirmed = true;
  }

  async confirmAvatar(): Promise<void> {
    if (!this.isValidInput()) {
      this.setErrorMessage('Bitte vervollständigen Sie Ihre Registrierung.');
      return;
    }

    this.setLoadingState(true);
    await this.tryRegisterUser();
  }

  private isValidInput(): boolean {
    const data = this.registrationService.getRegistrationData();
    return !!data && !!this.selectedAvatar;
  }

  private setLoadingState(isLoading: boolean): void {
    this.loading = isLoading;
  }

  private clearMessages(): void {
    this.errorMessage = null;
    this.successMessage = null;
  }

  private async tryRegisterUser(): Promise<void> {
    this.clearMessages();
    try {
      await this.registerNewUser();
      this.handleRegistrationSuccess();
    } catch (error: any) {
      this.handleRegistrationError(error);
    } finally {
      this.setLoadingState(false);
    }
  }

  private async registerNewUser(): Promise<void> {
    const data = this.getRegistrationData();
    const { email, password, name } = data;

    const userCredential = await this.registerWithAuthService(email, password);
    await this.createUserInDatabase(userCredential, name);
  }

  private getRegistrationData(): any {
    return this.registrationService.getRegistrationData();
  }

  private async registerWithAuthService(email: string, password: string): Promise<any> {
    return await firstValueFrom(this.authService.register(email, password));
  }

  private async createUserInDatabase(userCredential: any, name: string): Promise<void> {
    await this.userService.createUser({
      uid: userCredential.user?.uid,
      name: name,
      email: userCredential.user?.email,
      avatar: this.selectedAvatar,
    });
  }

  private handleRegistrationSuccess(): void {
    this.setSuccessMessage('Anmelden!');
    this.clearRegistrationData();
    this.navigateToLoginAfterDelay();
  }

  private setSuccessMessage(message: string): void {
    this.successMessage = message;
  }

  private setErrorMessage(message: string): void {
    this.errorMessage = message;
  }

  private clearRegistrationData(): void {
    this.registrationService.clear();
  }

  private navigateToLoginAfterDelay(): void {
    setTimeout(() => {
      this.router.navigate(['/login']);
    }, 1800);
  }

  private handleRegistrationError(error: any): void {
    const errorMessage = this.getErrorMessageForCode(error.code);
    this.setErrorMessage(errorMessage);
  }

  private getErrorMessageForCode(errorCode: string): string {
    const errorMessages: Record<string, string> = {
      'auth/email-already-in-use': 'Diese E-Mail-Adresse ist bereits registriert. Bitte verwenden Sie eine andere E-Mail oder melden Sie sich an.',
      'auth/weak-password': 'Das Passwort ist zu schwach. Bitte wählen Sie ein stärkeres Passwort.',
      'auth/invalid-email': 'Ungültige E-Mail-Adresse. Bitte überprüfen Sie Ihre Eingabe.',
      'auth/operation-not-allowed': 'Registrierung ist derzeit nicht möglich. Bitte versuchen Sie es später erneut.'
    };

    return errorMessages[errorCode] || 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.';
  }
}