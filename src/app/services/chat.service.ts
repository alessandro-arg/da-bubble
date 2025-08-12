/**
 * ChatService manages chat and group messaging functionality using Firebase Firestore.
 * It supports private chats, group messages, threads, reactions, message editing,
 * and tracks the current chat partner or group for UI components.
 */

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
import { Message, Reaction } from './../models/chat.model';
import { UserService } from './user.service';
import { User } from './../models/user.model';
import { Group } from './../models/group.model';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ChatService {
  readonly emptyStream: Observable<Message[]> = of([]);
  private currentChatPartner = new BehaviorSubject<User | null>(null);
  currentChatPartner$ = this.currentChatPartner.asObservable();
  private currentGroup = new BehaviorSubject<Group | null>(null);
  currentGroup$ = this.currentGroup.asObservable();

  constructor(private firestore: Firestore, private userService: UserService) {}

  /**
   * Creates a unique chat ID based on two user UIDs, ensuring consistent chat references.
   * @param uid1 First user's UID
   * @param uid2 Second user's UID
   * @returns Sorted concatenated string for consistent chat ID
   */
  private getChatId(uid1: string, uid2: string): string {
    return [uid1, uid2].sort().join('_');
  }

  /**
   * Ensures that a chat document exists for the given user UIDs.
   * @param uid1 Current user UID
   * @param uid2 Other user UID
   * @returns The generated chat ID
   */
  async ensureChat(uid1: string, uid2: string): Promise<string> {
    const chatId = this.getChatId(uid1, uid2);
    const chatRef = doc(this.firestore, `chats/${chatId}`);
    const snap = await getDoc(chatRef);

    if (!snap.exists()) {
      await setDoc(chatRef, {
        participants: [uid1, uid2],
        updatedAt: serverTimestamp(),
        lastRead: {
          [uid1]: serverTimestamp(),
          [uid2]: serverTimestamp(),
        },
      });
    } else {
      await updateDoc(chatRef, { updatedAt: serverTimestamp() });
    }

    return chatId;
  }

  /**
   * Retrieves messages for a specific chat in chronological order.
   * @param chatId Chat document ID
   * @returns Observable stream of Message[]
   */
  getChatMessages(chatId: string): Observable<Message[]> {
    const msgsRef = collection(this.firestore, `chats/${chatId}/messages`);
    const q = query(msgsRef, orderBy('createdAt', 'asc'));
    return collectionData(q, { idField: 'id' }) as Observable<Message[]>;
  }

  /**
   * Sends a private message to a specific chat.
   * @param chatId The chat document ID
   * @param senderUid Sender's UID
   * @param text Message content
   * @param mentions Array of mentioned user UIDs (optional)
   */
  async sendMessage(
    chatId: string,
    senderUid: string,
    text: string,
    mentions: string[] = []
  ): Promise<void> {
    const msgsRef = collection(this.firestore, `chats/${chatId}/messages`);
    await addDoc(msgsRef, {
      sender: senderUid,
      text,
      mentions,
      createdAt: serverTimestamp(),
    });
    const chatRef = doc(this.firestore, `chats/${chatId}`);
    await updateDoc(chatRef, { updatedAt: serverTimestamp() });
  }

  /**
   * Sends a message to a group chat.
   * @param groupId Group ID
   * @param senderUid Sender's UID
   * @param text Message text
   * @param mentions Optional array of mentioned UIDs
   */
  async sendGroupMessage(
    groupId: string,
    senderUid: string,
    text: string,
    mentions: string[] = []
  ): Promise<void> {
    const msgsRef = collection(this.firestore, `groups/${groupId}/messages`);
    await addDoc(msgsRef, {
      sender: senderUid,
      text,
      mentions,
      createdAt: serverTimestamp(),
    });
    const groupRef = doc(this.firestore, `groups/${groupId}`);
    await updateDoc(groupRef, { updatedAt: serverTimestamp() });
  }

  /**
   * Streams group messages in chronological order.
   * @param groupId Group ID
   * @returns Observable stream of group messages
   */
  getGroupMessages(groupId: string): Observable<Message[]> {
    const msgsRef = collection(this.firestore, `groups/${groupId}/messages`);
    const q = query(msgsRef, orderBy('createdAt', 'asc'));
    return collectionData(q, { idField: 'id' }) as Observable<Message[]>;
  }

  /**
   * Fetches metadata of a group by ID.
   * @param groupId Group ID
   * @returns Observable of Group data
   */
  getGroup(groupId: string): Observable<Group> {
    const groupRef = doc(this.firestore, `groups/${groupId}`);
    return docData(groupRef, { idField: 'id' }) as Observable<Group>;
  }

  /**
   * Retrieves participant user objects from a group.
   * @param groupId Group ID
   * @returns Array of User objects
   */
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
   * Adds a reaction to a message (chat or group).
   * @param id Chat or Group ID
   * @param messageId Message document ID
   * @param reaction Reaction object
   * @param isGroup Whether the message belongs to a group
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
   * Removes a specific user reaction (by emoji and user ID) from a message.
   * @param id Chat or Group ID
   * @param messageId Message document ID
   * @param emoji Emoji to remove
   * @param userId UID of the reacting user
   * @param isGroup Whether the message belongs to a group
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

  /**
   * Adds a reaction to a thread message inside a group chat.
   */
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

  /**
   * Removes a reaction from a thread message in a group.
   */
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
   * Updates the text of a message (chat or group).
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

  /**
   * Fetches a single group message by its ID.
   */
  getGroupMessage(groupId: string, messageId: string): Observable<Message> {
    const ref = doc(this.firestore, `groups/${groupId}/messages/${messageId}`);
    return docData(ref, { idField: 'id' }) as Observable<Message>;
  }

  /**
   * Streams all thread replies of a specific group message.
   */
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

  /**
   * Posts a reply into a thread under a group message.
   */
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
    const parentRef = doc(
      this.firestore,
      `groups/${groupId}/messages/${messageId}`
    );
    await updateDoc(parentRef, { updatedAt: serverTimestamp() });
  }

  /**
   * Updates a thread message in a group.
   */
  async updateGroupThreadMessage(
    groupId: string,
    parentMessageId: string,
    threadMessageId: string,
    newText: string
  ): Promise<void> {
    const ref = doc(
      this.firestore,
      `groups/${groupId}/messages/${parentMessageId}/threads/${threadMessageId}`
    );
    await updateDoc(ref, {
      text: newText,
      editedAt: serverTimestamp(),
    });
  }

  /**
   * Sets the currently selected chat partner (used in direct chat UI).
   * @param user The user object to set as the current partner.
   */
  setCurrentChatPartner(user: User) {
    this.currentChatPartner.next(user);
  }

  /**
   * Sets the currently selected group (used in group chat UI).
   * @param group The group object to set as the current group.
   */
  setCurrentGroup(group: Group) {
    this.currentGroup.next(group);
  }
}
