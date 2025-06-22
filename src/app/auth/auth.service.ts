import { Injectable } from '@angular/core';
import {
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User,
  GoogleAuthProvider,
  signInWithPopup,
  authState
} from '@angular/fire/auth';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { UserCredential } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();
  redirectUrl: string | null = null;

  constructor(
    private auth: Auth,
    private router: Router
  ) {
    authState(this.auth).subscribe(user => {
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
            errorMessage = 'Ungültige Anmeldedaten. Bitte überprüfen Sie E-Mail und Passwort.';
            break;
          case 'auth/user-not-found':
            errorMessage = 'Kein Konto mit dieser E-Mail gefunden.';
            break;
          case 'auth/wrong-password':
            errorMessage = 'Falsches Passwort.';
            break;
          case 'auth/too-many-requests':
            errorMessage = 'Zu viele fehlgeschlagene Versuche. Bitte später erneut versuchen.';
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
    return this.currentUser$.pipe(map(user => !!user));
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
          throw new Error('Ein Konto mit dieser E-Mail existiert bereits mit einer anderen Anmeldemethode.');
        } else {
          throw new Error('Google-Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.');
        }
      })
    );
  }
}