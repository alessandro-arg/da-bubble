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
  arrayUnion,
} from '@angular/fire/firestore';
import { Injectable } from '@angular/core';
import { of, Observable } from 'rxjs';
import { Message, Reaction } from './models/chat.model';
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

  /**
   * Append a reaction to a chat or group message.
   * @param isGroup  true for /groups, false for /chats
   */
  addReaction(
    id: string,
    messageId: string,
    reaction: Reaction,
    isGroup: boolean
  ): Promise<void> {
    const basePath = isGroup ? 'groups' : 'chats';
    const msgRef = doc(
      this.firestore,
      `${basePath}/${id}/messages/${messageId}`
    );
    return updateDoc(msgRef, {
      reactions: arrayUnion(reaction),
    });
  }

  /**
   * Remove all reactions matching (userId, emoji) from a message.
   */
  async removeReaction(
    id: string,
    messageId: string,
    emoji: string,
    userId: string,
    isGroup: boolean
  ): Promise<void> {
    const basePath = isGroup ? 'groups' : 'chats';
    const msgRef = doc(
      this.firestore,
      `${basePath}/${id}/messages/${messageId}`
    );
    const snap = await getDoc(msgRef);
    const current: Reaction[] = snap.exists()
      ? (snap.data() as any).reactions || []
      : [];
    const updated = current.filter(
      (r) => !(r.userId === userId && r.emoji === emoji)
    );
    return updateDoc(msgRef, { reactions: updated });
  }

  /** Append a reaction to a thread‐reply */
  addThreadReaction(
    groupId: string,
    parentMessageId: string,
    threadId: string,
    reaction: Reaction
  ): Promise<void> {
    const threadRef = doc(
      this.firestore,
      `groups/${groupId}/messages/${parentMessageId}/threads/${threadId}`
    );
    return updateDoc(threadRef, {
      reactions: arrayUnion(reaction),
    });
  }

  /** Remove a reaction from a thread‐reply */
  async removeThreadReaction(
    groupId: string,
    parentMessageId: string,
    threadId: string,
    emoji: string,
    userId: string
  ): Promise<void> {
    const threadRef = doc(
      this.firestore,
      `groups/${groupId}/messages/${parentMessageId}/threads/${threadId}`
    );
    const snap = await getDoc(threadRef);
    const current: Reaction[] = snap.exists()
      ? (snap.data() as any).reactions || []
      : [];
    const updated = current.filter(
      (r) => !(r.userId === userId && r.emoji === emoji)
    );
    return updateDoc(threadRef, { reactions: updated });
  }

  /**
   * Edit the text of a chat or group message.
   * @param id         chatId or groupId
   * @param messageId  the message.document ID
   * @param newText    the updated text
   * @param isGroup    true if this is a group message
   */
  async updateMessage(
    id: string,
    messageId: string,
    newText: string,
    isGroup: boolean
  ): Promise<void> {
    const base = isGroup ? 'groups' : 'chats';
    const msgRef = doc(this.firestore, `${base}/${id}/messages/${messageId}`);
    await updateDoc(msgRef, {
      text: newText,
      editedAt: serverTimestamp(),
    });
  }

  getGroupMessage(groupId: string, messageId: string): Observable<Message> {
    const ref = doc(this.firestore, `groups/${groupId}/messages/${messageId}`);
    return docData(ref, { idField: 'id' }) as Observable<Message>;
  }

  /** Stream replies in the group-thread sub-collection */
  getGroupThreadMessages(
    groupId: string,
    messageId: string
  ): Observable<Message[]> {
    const threadsRef = collection(
      this.firestore,
      `groups/${groupId}/messages/${messageId}/threads`
    );
    const q = query(threadsRef, orderBy('createdAt', 'asc'));
    return collectionData(q, { idField: 'id' }) as Observable<Message[]>;
  }

  /** Post a new reply into a group's thread */
  async sendGroupThreadMessage(
    groupId: string,
    messageId: string,
    senderUid: string,
    text: string
  ): Promise<void> {
    const threadsRef = collection(
      this.firestore,
      `groups/${groupId}/messages/${messageId}/threads`
    );
    await addDoc(threadsRef, {
      sender: senderUid,
      text,
      createdAt: serverTimestamp(),
    });
    // bump updatedAt on the parent message if desired:
    const parentRef = doc(
      this.firestore,
      `groups/${groupId}/messages/${messageId}`
    );
    await updateDoc(parentRef, { updatedAt: serverTimestamp() });
  }
}
