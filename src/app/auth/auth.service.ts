/* import { Injectable } from '@angular/core';
import { Auth, authState, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from '@angular/fire/auth';
import { User } from './../models/user.model'; // Assuming you have a User model defined

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
  currentUser$ = authState(this.auth);
} */

/* 

  guestLogin(): Promise<void> {
    // Implement guest login logic here
    // For example, you can create a guest user with predefined credentials
    return this.login('')
      .then(() => {
        console.log('Guest login successful');
      })
      .catch((error) => {
        console.error('Guest login failed:', error);
        throw error; // Re-throw the error for further handling if needed
      }
      );
    }

*/