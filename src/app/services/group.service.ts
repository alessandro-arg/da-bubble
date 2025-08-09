/**
 * GroupService provides CRUD operations and real-time access
 * to group data in Firestore. It supports creating groups,
 * adding/removing users, updating group info, and streaming group lists.
 */

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
  limit,
  query,
  where,
} from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { User } from './../models/user.model';
import { Group } from './../models/group.model';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class GroupService {
  constructor(private firestore: Firestore, private auth: Auth) {}

  /**
   * Creates a new group with the given name, description, and participants.
   * The currently logged-in user is automatically included in the group.
   *
   * @param name - Name of the group
   * @param description - Short description of the group
   * @param participants - Array of participant user UIDs
   * @returns Promise that resolves with the new group ID
   */
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

  /**
   * Retrieves all users from the Firestore 'users' collection.
   *
   * @returns Promise resolving to an array of User objects
   */
  async getAllUsers(): Promise<User[]> {
    const usersRef = collection(this.firestore, 'users');
    const snap = await getDocs(usersRef);
    return snap.docs.map((d) => ({
      uid: d.id,
      ...(d.data() as any),
    }));
  }

  /**
   * Creates a group that includes all users from the Firestore 'users' collection.
   *
   * @param name - Name of the group
   * @param description - Description of the group
   * @returns Promise resolving to the new group ID
   */
  async createGroupWithAllUsers(
    name: string,
    description: string
  ): Promise<string> {
    const usersRef = collection(this.firestore, 'users');
    const snapshot = await getDocs(usersRef);
    const allUids = snapshot.docs.map((d) => d.id);

    return this.createGroup(name, description, allUids);
  }

  /**
   * Updates the name and/or description of a group.
   *
   * @param groupId - ID of the group to update
   * @param data - Partial object with updated name and/or description
   * @returns Promise that resolves when the update is complete
   */
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

  /**
   * Adds a user to the group's participants.
   *
   * @param groupId - ID of the group
   * @param userId - UID of the user to add
   * @returns Promise that resolves when the update is complete
   */
  async addUserToGroup(groupId: string, userId: string): Promise<void> {
    const groupRef = doc(this.firestore, 'groups', groupId);
    await updateDoc(groupRef, {
      participants: arrayUnion(userId),
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * Removes a user from the group's participants and adds them to pastParticipants.
   *
   * @param groupId - ID of the group
   * @param userId - UID of the user to remove
   * @returns Promise that resolves when the update is complete
   */
  async removeUserFromGroup(groupId: string, userId: string): Promise<void> {
    const groupRef = doc(this.firestore, 'groups', groupId);
    await updateDoc(groupRef, {
      participants: arrayRemove(userId),
      pastParticipants: arrayUnion(userId),
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * Retrieves all groups as a one-time promise.
   *
   * @returns Promise resolving to an array of Group objects
   */
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

  /**
   * Retrieves all groups as a real-time observable.
   *
   * @returns Observable stream of Group[]
   */
  getAllGroupsLive(): Observable<Group[]> {
    const groupsRef = collection(
      this.firestore,
      'groups'
    ) as CollectionReference<Group>;
    return collectionData(groupsRef, { idField: 'id' }) as Observable<Group[]>;
  }

  /**
   * Checks if a group name already exists in Firestore.
   *
   * @param {string} name - The group name to check.
   * @returns {Promise<boolean>} Resolves to `true` if the name is already taken, otherwise `false`.
   */
  async isGroupNameTaken(name: string): Promise<boolean> {
    const groupsRef = collection(this.firestore, 'groups');
    const nameQuery = query(groupsRef, where('name', '==', name), limit(1));
    const snap = await getDocs(nameQuery);
    return !snap.empty;
  }

  /**
   * Retrieves all groups where the specified user is a participant.
   *
   * @param {string} uid - The UID of the user to look up.
   * @returns {Promise<Group[]>} A promise that resolves to an array of `Group` objects.
   */
  async getGroupsByMember(uid: string): Promise<Group[]> {
    const groupsRef = collection(this.firestore, 'groups');
    const q = query(groupsRef, where('participants', 'array-contains', uid));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as Group));
  }

  /**
   * Subscribes to real-time updates for all groups where the specified user is a participant.
   *
   * @param {string} uid - The UID of the user to subscribe to group updates for.
   * @returns {Observable<Group[]>} An observable that emits an array of `Group` objects whenever data changes.
   */
  getGroupsByMemberLive(uid: string): Observable<Group[]> {
    const groupsRef = collection(
      this.firestore,
      'groups'
    ) as CollectionReference<Group>;
    const q = query(groupsRef, where('participants', 'array-contains', uid));
    return collectionData(q, { idField: 'id' }) as Observable<Group[]>;
  }
}
