import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
} from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { User } from './models/user.model';

@Injectable({
  providedIn: 'root',
})
export class GroupService {
  constructor(private firestore: Firestore, private auth: Auth) {}

  async createGroup(
    name: string,
    description: string,
    participants: string[]
  ): Promise<string> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) {
      throw new Error('Not signed in');
    }
    const participantSet = new Set(participants);
    participantSet.add(currentUser.uid);
    const finalParticipants = Array.from(participantSet);
    const groupsRef = collection(this.firestore, 'groups');
    const groupDoc = await addDoc(groupsRef, {
      name,
      description,
      participants: finalParticipants,
      creator: currentUser.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return groupDoc.id;
  }

  async getAllUsers(): Promise<User[]> {
    const usersRef = collection(this.firestore, 'users');
    const snap = await getDocs(usersRef);
    return snap.docs.map((d) => ({
      uid: d.id,
      ...(d.data() as any),
    }));
  }

  async createGroupWithAllUsers(
    name: string,
    description: string
  ): Promise<string> {
    const usersRef = collection(this.firestore, 'users');
    const snapshot = await getDocs(usersRef);
    const allUids = snapshot.docs.map((d) => d.id);

    return this.createGroup(name, description, allUids);
  }
}
