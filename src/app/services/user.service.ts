/**
 * UserService provides CRUD operations for user data in Firestore.
 * It supports creating, retrieving, updating, and streaming user records.
 */

import { Injectable } from '@angular/core';
import {
  Firestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  CollectionReference,
  collectionData,
  query,
  where,
} from '@angular/fire/firestore';
import { User } from '../models/user.model';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UserService {
  constructor(private firestore: Firestore) {}

  /**
   * Creates a new user document in Firestore.
   * If optional fields are missing, fallback defaults are used.
   *
   * @param user - Partial user object containing at least the `uid`
   * @throws Error if `uid` is missing
   */
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
      displayName: user.name || '',
      photoURL: user.avatar || 'assets/img/profile.svg',
      lastSeen: new Date(),
    });
  }

  /**
   * Retrieves a single user by UID.
   *
   * @param uid - The UID of the user to retrieve
   * @returns Promise resolving to the user object or null if not found
   */
  async getUser(uid: string): Promise<User | null> {
    const userDoc = await getDoc(doc(this.firestore, 'users', uid));
    return userDoc.exists() ? (userDoc.data() as User) : null;
  }

  /**
   * Fetches all users as a one-time snapshot.
   *
   * @returns Promise resolving to an array of all users
   */
  async getAllUsers(): Promise<User[]> {
    const usersRef = collection(
      this.firestore,
      'users'
    ) as CollectionReference<User>;
    const querySnapshot = await getDocs(usersRef);
    return querySnapshot.docs.map((doc) => doc.data());
  }

  /**
   * Streams all user documents as a live observable.
   *
   * @returns Observable that emits user list in real-time
   */
  getAllUsersLive(): Observable<User[]> {
    const usersRef = collection(
      this.firestore,
      'users'
    ) as CollectionReference<User>;
    return collectionData(usersRef, { idField: 'uid' }) as Observable<User[]>;
  }

  /**
   * Updates an existing user document with new data.
   *
   * @param uid - UID of the user to update
   * @param data - Partial user object with fields to update
   * @throws Error if UID is not provided
   */
  async updateUser(uid: string, data: Partial<User>) {
    if (!uid) throw new Error('User UID is required');

    const userRef = doc(this.firestore, `users/${uid}`);
    await updateDoc(userRef, data);
  }

  /** Returns true if any user has exactly this email */
  async isEmailTaken(email: string): Promise<boolean> {
    const usersRef = collection(this.firestore, 'users');
    const q = query(usersRef, where('email', '==', email));
    const snap = await getDocs(q);
    return !snap.empty;
  }

  /** Returns true if any user has exactly this name */
  async isNameTaken(name: string): Promise<boolean> {
    const usersRef = collection(this.firestore, 'users');
    const q = query(usersRef, where('name', '==', name));
    const snap = await getDocs(q);
    return !snap.empty;
  }
}
