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
} from '@angular/fire/firestore';
import { User } from '../app/models/user.model';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UserService {
  constructor(private firestore: Firestore) {}

  async createUser(user: Partial<User>) {
    if (!user.uid) throw new Error('User UID is required');

    const userRef = doc(this.firestore, `users/${user.uid}`);
    await setDoc(userRef, {
      uid: user.uid, // Wichtig: UID im Dokument speichern
      name: user.name,
      email: user.email,
      avatar: user.avatar || 'assets/img/profile.svg',
      createdAt: new Date(),
    });
  }

  async getUser(uid: string): Promise<User | null> {
    const userDoc = await getDoc(doc(this.firestore, 'users', uid));
    return userDoc.exists() ? (userDoc.data() as User) : null;
  }

  async getAllUsers(): Promise<User[]> {
    const usersRef = collection(
      this.firestore,
      'users'
    ) as CollectionReference<User>;
    const querySnapshot = await getDocs(usersRef);
    return querySnapshot.docs.map((doc) => doc.data());
  }

  getAllUsersLive(): Observable<User[]> {
    const usersRef = collection(
      this.firestore,
      'users'
    ) as CollectionReference<User>;
    return collectionData(usersRef, { idField: 'uid' }) as Observable<User[]>;
  }

  async updateUser(uid: string, data: Partial<User>) {
    if (!uid) throw new Error('User UID is required');

    const userRef = doc(this.firestore, `users/${uid}`);
    await updateDoc(userRef, data);
  }
}
