import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../auth/auth.service';
import { UserService } from '../../../../services/user.service';
import { User } from '../../../../models/user.model';
import { RegistrationService } from '../../../../services/registration.service';
import { firstValueFrom } from 'rxjs';
import { MobileService } from '../../../../services/mobile.service';

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
  isMobile = false;
  arrowHover = false;
  registrationName = '';

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private registrationService: RegistrationService,
    private router: Router,
    private mobileService: MobileService
  ) {}

  /**
   * Lifecycle hook that is called after Angular has initialized the component.
   * This method subscribes to the current user data to ensure the component
   * reacts to changes in user information.
   */
  ngOnInit() {
    this.mobileService.isMobile$.subscribe((isMobile) => {
      this.isMobile = isMobile;
    });

    this.subscribeToCurrentUser();

    const data = this.registrationService.getRegistrationData();
    if (data?.name) {
      this.registrationName = data.name;
    }
  }

  /**
   * Retrieves an array of file paths for avatar images.
   * @returns {string[]} An array of strings representing the paths to avatar image files.
   */
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

  /**
   * Subscribes to the current user observable from the authentication service.
   * When a user is emitted, it handles the Firebase user asynchronously.
   */
  private subscribeToCurrentUser(): void {
    this.authService.currentUser$.subscribe(async (firebaseUser) => {
      if (firebaseUser) {
        await this.handleFirebaseUser(firebaseUser);
      }
    });
  }

  /**
   * Handles the Firebase user by retrieving the user data based on their UID
   * and processing guest user logic.
   *
   * @param firebaseUser - The Firebase user object containing user information.
   * @returns A promise that resolves when the user data is retrieved and guest user logic is handled.
   */
  private async handleFirebaseUser(firebaseUser: any): Promise<void> {
    this.currentUser = await this.getUser(firebaseUser.uid);
    this.handleGuestUser();
  }

  /**
   * Retrieves the user information based on the provided unique identifier (UID).
   *
   * @param uid - The unique identifier of the user to retrieve.
   * @returns A promise that resolves to the `User` object if found, or `null` if no user exists with the given UID.
   */
  private async getUser(uid: string): Promise<User | null> {
    return await this.userService.getUser(uid);
  }

  /**
   * Handles the logic for guest users by setting a default avatar
   * and confirming the avatar selection.
   * This method checks if the current user is a guest and performs
   * the necessary actions to ensure the guest user has an avatar.
   */
  private handleGuestUser(): void {
    if (this.currentUser?.isGuest) {
      this.setGuestAvatar();
    }
  }

  /**
   * Sets the guest user's avatar by assigning the current user's avatar
   * to the selected avatar property. This method ensures that the selected
   * avatar corresponds to the avatar of the current user, if available.
   */
  private setGuestAvatar(): void {
    if (this.currentUser) {
      this.selectedAvatar = this.currentUser.avatar;
    }
  }

  /**
   * Selects an avatar and updates the component's state accordingly.
   *
   * @param avatar - The identifier or URL of the avatar to be selected.
   *
   * This method sets the `selectedAvatar` property to the provided avatar,
   * confirms the avatar selection by setting `avatarSelectedConfirmed` to `true`,
   * and then resets the confirmation state to `false` after a delay of 1500 milliseconds.
   */
  selectAvatar(avatar: string): void {
    this.selectedAvatar = avatar;
    this.avatarSelectedConfirmed = true;
    setTimeout(() => {
      this.avatarSelectedConfirmed = false;
    }, 1500);
  }

  /**
   * Confirms the avatar selection and proceeds with the registration process.
   *
   * This method first validates the user input to ensure all required fields are completed.
   * If the input is invalid, it sets an error message prompting the user to complete their registration.
   *
   * If the input is valid, it sets the loading state to true and attempts to register the user asynchronously.
   *
   * @returns {Promise<void>} A promise that resolves when the registration process is complete.
   */
  async confirmAvatar(): Promise<void> {
    if (!this.isValidInput()) {
      this.setErrorMessage('Bitte vervollständigen Sie Ihre Registrierung.');
      return;
    }

    this.setLoadingState(true);
    await this.tryRegisterUser();
  }

  /**
   * Determines whether the input is valid based on the registration data and selected avatar.
   *
   * @returns {boolean} `true` if the registration data exists and an avatar is selected; otherwise, `false`.
   */
  private isValidInput(): boolean {
    const data = this.registrationService.getRegistrationData();
    return !!data && !!this.selectedAvatar;
  }

  /**
   * Sets the loading state of the component.
   *
   * @param isLoading - A boolean value indicating whether the component is in a loading state.
   */
  private setLoadingState(isLoading: boolean): void {
    this.loading = isLoading;
  }

  /**
   * Clears any existing error and success messages.
   * Sets both `errorMessage` and `successMessage` to `null`.
   * This method is typically used to reset the state of messages
   * before performing new operations or updates.
   */
  private clearMessages(): void {
    this.errorMessage = null;
    this.successMessage = null;
  }

  /**
   * Attempts to register a new user by clearing messages, invoking the registration process,
   * and handling success or error scenarios. Ensures the loading state is updated upon completion.
   *
   * @returns {Promise<void>} A promise that resolves when the registration process is complete.
   *
   * @throws {any} Propagates any errors encountered during the registration process.
   */
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

  /**
   * Registers a new user by performing the following steps:
   * 1. Retrieves registration data including email, password, and name.
   * 2. Registers the user with the authentication service using the provided email and password.
   * 3. Creates a user entry in the database with the obtained user credentials and name.
   *
   * @returns {Promise<void>} A promise that resolves when the registration process is complete.
   * @throws {Error} Throws an error if registration with the authentication service or database creation fails.
   */
  private async registerNewUser(): Promise<void> {
    const data = this.getRegistrationData();
    const { email, password, name } = data;

    const userCredential = await this.registerWithAuthService(email, password);
    await this.createUserInDatabase(userCredential, name);
  }

  /**
   * Retrieves the registration data from the registration service.
   *
   * @returns {any} The registration data.
   */
  private getRegistrationData(): any {
    return this.registrationService.getRegistrationData();
  }

  /**
   * Registers a user using the authentication service with the provided email and password.
   * This method wraps the authentication service's registration method and converts its
   * observable result into a Promise using `firstValueFrom`.
   *
   * @param email - The email address of the user to register.
   * @param password - The password for the user to register.
   * @returns A Promise that resolves with the result of the registration process.
   */
  private async registerWithAuthService(
    email: string,
    password: string
  ): Promise<any> {
    return await firstValueFrom(this.authService.register(email, password));
  }

  /**
   * Creates a new user in the database with the provided credentials and user details.
   *
   * @param userCredential - The user credential object containing authentication details.
   * @param name - The name of the user to be stored in the database.
   * @returns A promise that resolves when the user is successfully created in the database.
   */
  private async createUserInDatabase(
    userCredential: any,
    name: string
  ): Promise<void> {
    await this.userService.createUser({
      uid: userCredential.user?.uid,
      name: name,
      email: userCredential.user?.email,
      avatar: this.selectedAvatar,
    });
  }

  /**
   * Handles the successful registration process by performing the following actions:
   * - Sets a success message to notify the user.
   * - Clears any stored registration data.
   * - Navigates to the login page after a short delay.
   *
   * This method is intended to be called upon successful completion of the registration workflow.
   */
  private handleRegistrationSuccess(): void {
    this.setSuccessMessage('Anmelden!');
    this.clearRegistrationData();
    this.navigateToLoginAfterDelay();
  }

  /**
   * Sets the success message to be displayed.
   *
   * @param message - The success message to set.
   */
  private setSuccessMessage(message: string): void {
    this.successMessage = message;
  }

  /**
   * Sets the error message to be displayed.
   *
   * @param message - The error message to set.
   */
  private setErrorMessage(message: string): void {
    this.errorMessage = message;
  }

  /**
   * Clears the registration data by invoking the `clear` method
   * of the `registrationService`. This is typically used to reset
   * the registration state during the user registration process.
   */
  private clearRegistrationData(): void {
    this.registrationService.clear();
  }

  /**
   * Navigates to the login page after a specified delay.
   * This method uses a timeout to delay the navigation by 1800 milliseconds.
   *
   * @private
   */
  private navigateToLoginAfterDelay(): void {
    setTimeout(() => {
      this.router.navigate(['/login']);
    }, 1800);
  }

  /**
   * Handles registration errors by mapping the error code to a user-friendly error message
   * and setting it for display.
   *
   * @param error - The error object containing details about the registration failure.
   *                Expected to have a `code` property that identifies the type of error.
   */
  private handleRegistrationError(error: any): void {
    const errorMessage = this.getErrorMessageForCode(error.code);
    this.setErrorMessage(errorMessage);
  }

  /**
   * Retrieves a user-friendly error message based on the provided authentication error code.
   *
   * @param errorCode - The error code returned by the authentication process.
   * @returns A string containing the corresponding error message in German. If the error code
   *          is not recognized, a generic error message is returned.
   *
   * Error Codes:
   * - 'auth/email-already-in-use': Indicates the email address is already registered.
   * - 'auth/weak-password': Indicates the password provided is too weak.
   * - 'auth/invalid-email': Indicates the email address format is invalid.
   * - 'auth/operation-not-allowed': Indicates that registration is currently disabled.
   */
  private getErrorMessageForCode(errorCode: string): string {
    const errorMessages: Record<string, string> = {
      'auth/email-already-in-use':
        'Diese E-Mail-Adresse ist bereits registriert. Bitte verwenden Sie eine andere E-Mail oder melden Sie sich an.',
      'auth/weak-password':
        'Das Passwort ist zu schwach. Bitte wählen Sie ein stärkeres Passwort.',
      'auth/invalid-email':
        'Ungültige E-Mail-Adresse. Bitte überprüfen Sie Ihre Eingabe.',
      'auth/operation-not-allowed':
        'Registrierung ist derzeit nicht möglich. Bitte versuchen Sie es später erneut.',
    };

    return (
      errorMessages[errorCode] ||
      'Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.'
    );
  }
}
