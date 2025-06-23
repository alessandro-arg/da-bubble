import { Injectable } from '@angular/core';
import {
  Firestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  getDocs,
  collection,
} from '@angular/fire/firestore';
import { User } from '../app/models/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  constructor(private firestore: Firestore) {}

  async createUser(user: Partial<User>) {
    if (!user.uid) throw new Error('User UID is required');

    const allUsersSnap = await getDocs(collection(this.firestore, 'users'));
    const otherUsers = allUsersSnap.docs
      .map((doc) => doc.data() as User)
      .filter((otherUser) => otherUser.uid !== user.uid);

    const userRef = doc(this.firestore, `users/${user.uid}`);
    await setDoc(userRef, {
      uid: user.uid, // Wichtig: UID im Dokument speichern
      name: user.name,
      email: user.email,
      avatar: user.avatar || 'assets/img/profile.svg',
      createdAt: new Date(),
    });

    for (const otherUser of otherUsers) {
      const chatId =
        user.uid < otherUser.uid
          ? `${user.uid}_${otherUser.uid}`
          : `${otherUser.uid}_${user.uid}`;

      const chatRef = doc(this.firestore, `chats/${chatId}`);
      const chatSnap = await getDoc(chatRef);

      if (!chatSnap.exists()) {
        // 3. Create chat if it doesn't exist
        await setDoc(chatRef, {
          members: [user.uid, otherUser.uid],
          createdAt: new Date(),
        });
      }

      const newUserChatRef = doc(
        this.firestore,
        `userChats/${user.uid}/chats/${chatId}`
      );
      const otherUserChatRef = doc(
        this.firestore,
        `userChats/${otherUser.uid}/chats/${chatId}`
      );

      const chatMeta = {
        chatId,
        receiverId: otherUser.uid,
        lastMessage: '',
        updatedAt: new Date(),
      };

      await setDoc(newUserChatRef, chatMeta);
      await setDoc(otherUserChatRef, {
        chatId,
        receiverId: user.uid,
        lastMessage: '',
        updatedAt: new Date(),
      });
    }
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
