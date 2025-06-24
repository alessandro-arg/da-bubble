import { Injectable } from '@angular/core';
import {
  Firestore,
  doc,
  setDoc,
  updateDoc,
  collection,
  collectionData,
  addDoc,
  query,
  orderBy,
  serverTimestamp,
} from '@angular/fire/firestore';
import { Message, Chat } from './models/chat.model';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ChatService {
  constructor(private firestore: Firestore) {}

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
}
