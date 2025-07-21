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
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();
  redirectUrl: string | null = null;

  constructor(private auth: Auth, private router: Router) {
    authState(this.auth).subscribe((user) => {
      this.currentUserSubject.next(user);
    });
  }

  login(email: string, password: string): Observable<UserCredential> {
    return from(signInWithEmailAndPassword(this.auth, email, password)).pipe(
      catchError((error: FirebaseError) => {
        console.error('Firebase login error:', error);
        let errorMessage = 'Login fehlgeschlagen.';

        switch (error.code) {
          case 'auth/invalid-credential':
            errorMessage =
              'Ungültige Anmeldedaten. Bitte überprüfen Sie E-Mail und Passwort.';
            break;
          case 'auth/user-not-found':
            errorMessage = 'Kein Konto mit dieser E-Mail gefunden.';
            break;
          case 'auth/wrong-password':
            errorMessage = 'Falsches Passwort.';
            break;
          case 'auth/too-many-requests':
            errorMessage =
              'Zu viele fehlgeschlagene Versuche. Bitte später erneut versuchen.';
            break;
        }

        throw new Error(errorMessage);
      })
    );
  }

  register(email: string, password: string) {
    return from(createUserWithEmailAndPassword(this.auth, email, password));
  }

  logout(): Observable<void> {
    return from(signOut(this.auth)).pipe(
      map(() => {
        this.currentUserSubject.next(null);
        this.router.navigate(['/login']);
      })
    );
  }

  isLoggedIn(): Observable<boolean> {
    return this.currentUser$.pipe(map((user) => !!user));
  }

  loginWithGoogle(): Observable<any> {
    const provider = new GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');

    //provider.addScope('https://www.googleapis.com/auth/contacts.readonly');
    //provider.addScope('https://www.googleapis.com/auth/user.birthday.read');
    //provider.addScope('https://www.googleapis.com/auth/user.addresses.read');

    return from(signInWithPopup(this.auth, provider)).pipe(
      catchError((error: any) => {
        console.error('Google login error:', error);
        // Spezifische Fehlerbehandlung
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
