import { Injectable } from '@angular/core';
import { Auth, authState, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from '@angular/fire/auth';
import { User } from './models/user.model'; // Assuming you have a User model defined

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private auth: Auth) {}
  login(email: string, password: string) {
    return signInWithEmailAndPassword(this.auth, email, password);
  }
  register(email: string, password: string) {
    return createUserWithEmailAndPassword(this.auth, email, password);
  }
  logout() {
    return signOut(this.auth);
  }

  isLoggedIn() {
    return !!this.auth.currentUser;
  }

  redirectUrl: string | null = null;
  currentUser$ = authState(this.auth);
}