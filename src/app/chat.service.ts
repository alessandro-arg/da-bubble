import {
  Firestore,
  doc,
  collection,
  collectionData,
  query,
  orderBy,
  addDoc,
  updateDoc,
  serverTimestamp,
  getDoc,
  setDoc,
  docData,
} from '@angular/fire/firestore';
import { Injectable } from '@angular/core';
import { of, Observable } from 'rxjs';
import { Message } from './models/chat.model';
import { UserService } from './user.service';
import { User } from './models/user.model';
import { Group } from './models/group.model';

@Injectable({ providedIn: 'root' })
export class ChatService {
  readonly emptyStream: Observable<Message[]> = of([]);

  constructor(private firestore: Firestore, private userService: UserService) {}

  private getChatId(uid1: string, uid2: string): string {
    return [uid1, uid2].sort().join('_');
  }

  async ensureChat(uid1: string, uid2: string): Promise<string> {
    const chatId = this.getChatId(uid1, uid2);
    const chatRef = doc(this.firestore, `chats/${chatId}`);
    await setDoc(
      chatRef,
      {
        participants: [uid1, uid2],
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    return chatId;
  }

  getChatMessages(chatId: string): Observable<Message[]> {
    const msgsRef = collection(this.firestore, `chats/${chatId}/messages`);
    const q = query(msgsRef, orderBy('createdAt', 'asc'));
    return collectionData(q, { idField: 'id' }) as Observable<Message[]>;
  }

  async sendMessage(
    chatId: string,
    senderUid: string,
    text: string
  ): Promise<void> {
    const msgsRef = collection(this.firestore, `chats/${chatId}/messages`);
    await addDoc(msgsRef, {
      sender: senderUid,
      text,
      createdAt: serverTimestamp(),
    });
    const chatRef = doc(this.firestore, `chats/${chatId}`);
    await updateDoc(chatRef, { updatedAt: serverTimestamp() });
  }

  async sendGroupMessage(
    groupId: string,
    senderUid: string,
    text: string
  ): Promise<void> {
    const msgsRef = collection(this.firestore, `groups/${groupId}/messages`);
    await addDoc(msgsRef, {
      sender: senderUid,
      text,
      createdAt: serverTimestamp(),
    });
    const groupRef = doc(this.firestore, `groups/${groupId}`);
    await updateDoc(groupRef, { updatedAt: serverTimestamp() });
  }

  getGroupMessages(groupId: string): Observable<Message[]> {
    const msgsRef = collection(this.firestore, `groups/${groupId}/messages`);
    const q = query(msgsRef, orderBy('createdAt', 'asc'));
    return collectionData(q, { idField: 'id' }) as Observable<Message[]>;
  }

  getGroup(groupId: string): Observable<Group> {
    const groupRef = doc(this.firestore, `groups/${groupId}`);
    return docData(groupRef, { idField: 'id' }) as Observable<Group>;
  }

  async getGroupParticipants(groupId: string): Promise<User[]> {
    const groupRef = doc(this.firestore, `groups/${groupId}`);
    const snap = await getDoc(groupRef);
    const data = snap.data?.();
    const uids: string[] = Array.isArray(data?.['participants'])
      ? (data!['participants'] as string[])
      : [];
    const users = await Promise.all(
      uids.map((uid) => this.userService.getUser(uid))
    );
    return users.filter((u): u is User => u !== null);
  }
}
