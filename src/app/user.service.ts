import { Injectable } from '@angular/core';
import {
  Firestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
} from '@angular/fire/firestore';
import { User } from '../app/models/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  constructor(private firestore: Firestore) {}

  async createUser(user: Partial<User>) {
    if (!user.uid) throw new Error('User UID is required');

    const userRef = doc(this.firestore, `users/${user.uid}`);
    await setDoc(userRef, {
      uid: user.uid,
      name: user.name || 'Unbekannter Gast',
      email: user.email || '',
      avatar: user.avatar || 'assets/img/profile.svg',
      isGuest: user.isGuest || false,
      createdAt: user.createdAt || new Date(),
      displayName: user.displayName || user.name,
      photoURL: user.photoURL || user.avatar,
      lastSeen: new Date()
    });
  }

  async getUser(uid: string): Promise<User | null> {
    const userDoc = await getDoc(doc(this.firestore, 'users', uid));
    return userDoc.exists() ? (userDoc.data() as User) : null;
  }

  async updateUser(uid: string, data: Partial<User>) {
    if (!uid) throw new Error('User UID is required');

    const userRef = doc(this.firestore, `users/${uid}`);
    await updateDoc(userRef, data);
  }
}
