/**
 * AuthService handles user authentication using Firebase Auth.
 * It supports email/password login and registration, Google login, guest login,
 * password reset functionality, and exposes the current authenticated user as an observable.
 */

import { Injectable } from '@angular/core';
import {
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User,
  GoogleAuthProvider,
  signInWithPopup,
  authState,
} from '@angular/fire/auth';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { UserCredential } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { sendPasswordResetEmail, confirmPasswordReset } from 'firebase/auth';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  public currentUserSubject = new BehaviorSubject<User | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();
  redirectUrl: string | null = null;

  constructor(private auth: Auth, private router: Router) {
    authState(this.auth).subscribe((user) => {
      this.currentUserSubject.next(user);
    });
  }

  /**
   * Logs in a user with email and password.
   * @param email User's email.
   * @param password User's password.
   * @returns Observable emitting UserCredential or throwing a formatted error.
   */

  login(email: string, password: string): Observable<UserCredential> {
    return from(signInWithEmailAndPassword(this.auth, email, password));
  }

  /**
   * Registers a new user with email and password.
   * @param email New user's email.
   * @param password New user's password.
   * @returns Observable emitting UserCredential.
   */
  register(email: string, password: string) {
    return from(createUserWithEmailAndPassword(this.auth, email, password));
  }

  /**
   * Logs out the current user and navigates to the login page.
   * @returns Observable that completes when logout is done.
   */
  logout(): Observable<void> {
    return from(signOut(this.auth)).pipe(
      map(() => {
        this.currentUserSubject.next(null);
        this.router.navigate(['/login']);
      })
    );
  }

  /**
   * Checks whether a user is currently logged in.
   * @returns Observable emitting true if user is logged in, false otherwise.
   */
  isLoggedIn(): Observable<boolean> {
    return this.currentUser$.pipe(map((user) => !!user));
  }

  /**
   * Logs in the user using Google Sign-In via popup.
   * @returns Observable emitting the user credentials or throwing error.
   */
  loginWithGoogle(): Observable<any> {
    const provider = new GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');

    return from(signInWithPopup(this.auth, provider)).pipe(
      catchError((error: any) => {
        console.error('Google login error:', error);
        if (error.code === 'auth/account-exists-with-different-credential') {
          throw new Error(
            'Ein Konto mit dieser E-Mail existiert bereits mit einer anderen Anmeldemethode.'
          );
        } else {
          throw new Error(
            'Google-Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.'
          );
        }
      })
    );
  }

  /**
   * Logs in using predefined guest credentials from environment config.
   * @returns Observable emitting UserCredential or throwing a formatted error.
   */
  guestLogin(): Observable<UserCredential> {
    const guestEmail = environment.guestEmail;
    const guestPassword = environment.guestPassword;

    return from(
      signInWithEmailAndPassword(this.auth, guestEmail, guestPassword)
    ).pipe(
      catchError((error: FirebaseError) => {
        console.error('Guest login error:', error);
        let errorMessage = 'Gast-Login fehlgeschlagen.';

        switch (error.code) {
          case 'auth/invalid-credential':
            errorMessage = 'Ungültige Gast-Zugangsdaten.';
            break;
          case 'auth/too-many-requests':
            errorMessage =
              'Zu viele Login-Versuche. Bitte später erneut versuchen.';
            break;
        }

        throw new Error(errorMessage);
      })
    );
  }

  /**
   * Generates a random guest display name using adjective-noun combination.
   * @returns A friendly guest name string.
   */
  generateRandomGuestName(): string {
    const adjectives = [
      'Freundlicher',
      'Neugieriger',
      'Glücklicher',
      'Mutiger',
      'Kreativer',
    ];
    const nouns = ['Besucher', 'Entdecker', 'Gast', 'Reisender', 'Teilnehmer'];
    const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    return `${randomAdj} ${randomNoun}`;
  }

  /**
   * Sends a password reset email to the specified user email.
   * @param email The user's email to send reset link to.
   * @returns Observable that completes when email is sent, or throws an error.
   */
  sendPasswordResetEmail(email: string): Observable<void> {
    const actionCodeSettings = {
      url: 'http://localhost:4200/reset-password',
      handleCodeInApp: true,
    };

    return from(
      sendPasswordResetEmail(this.auth, email, actionCodeSettings)
    ).pipe(
      catchError((error: FirebaseError) => {
        console.error('Password reset error:', error);
        let errorMessage = 'Fehler beim Senden der Zurücksetzen-E-Mail.';

        switch (error.code) {
          case 'auth/invalid-email':
            errorMessage = 'Ungültige E-Mail-Adresse.';
            break;
          case 'auth/user-not-found':
            errorMessage = 'Kein Benutzer mit dieser E-Mail-Adresse gefunden.';
            break;
          case 'auth/too-many-requests':
            errorMessage =
              'Zu viele Anfragen. Bitte versuchen Sie es später erneut.';
            break;
        }

        throw new Error(errorMessage);
      })
    );
  }

  /**
   * Confirms a password reset using a reset code and new password.
   * @param code The reset code from the password reset email.
   * @param newPassword The new password to set.
   * @returns Observable that completes when password is successfully reset or throws error.
   */
  confirmPasswordReset(code: string, newPassword: string): Observable<void> {
    return from(confirmPasswordReset(this.auth, code, newPassword)).pipe(
      catchError((error: FirebaseError) => {
        console.error('Password reset confirmation error:', error);
        let errorMessage = 'Fehler beim Zurücksetzen des Passworts.';

        switch (error.code) {
          case 'auth/expired-action-code':
            errorMessage = 'Der Zurücksetzen-Code ist abgelaufen.';
            break;
          case 'auth/invalid-action-code':
            errorMessage = 'Ungültiger Zurücksetzen-Code.';
            break;
          case 'auth/user-disabled':
            errorMessage = 'Dieser Benutzer ist deaktiviert.';
            break;
          case 'auth/user-not-found':
            errorMessage = 'Kein Benutzer mit dieser E-Mail-Adresse gefunden.';
            break;
          case 'auth/weak-password':
            errorMessage = 'Das Passwort ist zu schwach.';
            break;
        }

        throw new Error(errorMessage);
      })
    );
  }
}

/*

  const actionCodeSettings = {
      url: 'https://ihre-domain.de/reset-password',
      handleCodeInApp: true
    };


    und auf der Firebase-Konsole unter "Authentifizierung" > "E-Mail-Vorlagen" > "Passwort zurücksetzen" den Link anpassen:
    <a href="https://ihre-domain.de/reset-password?oobCode={{code}}">Passwort zurücksetzen</a>
    Dies stellt sicher, dass der Link korrekt funktioniert und die Benutzer nach dem Zurücksetzen des Passworts zur richtigen Seite weitergeleitet werden.



    https://dabubble-db274.firebaseapp.com/__/auth/action?mode=action&oobCode=code



    https://dabubble-db274.firebaseapp.com/__/auth/action?mode=action&oobCode=code

*/
