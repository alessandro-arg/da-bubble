import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
  arrayUnion,
  doc,
  updateDoc,
  arrayRemove,
  collectionData,
  CollectionReference,
} from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { User } from './models/user.model';
import { Group } from './models/group.model';
import { Observable } from 'rxjs';

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
      pastParticipants: finalParticipants,
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

  async updateGroup(
    groupId: string,
    data: { name?: string; description?: string }
  ): Promise<void> {
    const groupRef = doc(this.firestore, 'groups', groupId);
    await updateDoc(groupRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  }

  async addUserToGroup(groupId: string, userId: string): Promise<void> {
    const groupRef = doc(this.firestore, 'groups', groupId);
    await updateDoc(groupRef, {
      participants: arrayUnion(userId),
      updatedAt: serverTimestamp(),
    });
  }

  async removeUserFromGroup(groupId: string, userId: string): Promise<void> {
    const groupRef = doc(this.firestore, 'groups', groupId);
    await updateDoc(groupRef, {
      participants: arrayRemove(userId),
      pastParticipants: arrayUnion(userId),
      updatedAt: serverTimestamp(),
    });
  }

  async getAllGroups(): Promise<Group[]> {
    const groupsRef = collection(this.firestore, 'groups');
    const querySnapshot = await getDocs(groupsRef);
    return querySnapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        } as Group)
    );
  }

  getAllGroupsLive(): Observable<Group[]> {
    const groupsRef = collection(
      this.firestore,
      'groups'
    ) as CollectionReference<Group>;
    return collectionData(groupsRef, { idField: 'id' }) as Observable<Group[]>;
  }
}
