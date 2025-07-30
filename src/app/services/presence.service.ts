/**
 * PresenceService manages real-time user presence (online/offline) status
 * using Firebase Realtime Database. It tracks connection state, handles
 * automatic status updates on disconnect, and exposes status info as observables.
 */

import { Injectable } from '@angular/core';
import {
  Database,
  ref,
  onValue,
  onDisconnect,
  serverTimestamp,
  update,
  push,
  set,
} from '@angular/fire/database';
import { Auth, authState } from '@angular/fire/auth';
import { Observable } from 'rxjs';
import { filter, switchMap } from 'rxjs/operators';

/**
 * Describes a user's presence record in the Realtime Database.
 */
export interface PresenceRecord {
  state: 'online' | 'offline';
  last_changed: number;
}

@Injectable({ providedIn: 'root' })
export class PresenceService {
  /**
   * Sets up automatic online/offline presence tracking for the authenticated user.
   * - Listens to `.info/connected` to detect Firebase connection state
   * - Creates a unique connection node in `/status/{uid}/connections`
   * - Removes connection node and updates status to offline on disconnect
   *
   * @param db Firebase Realtime Database instance
   * @param auth Firebase Authentication instance
   */
  constructor(private db: Database, private auth: Auth) {
    authState(this.auth)
      .pipe(
        filter((u) => !!u),
        switchMap((user) => {
          const uid = user!.uid;
          const statusRef = ref(this.db, `status/${uid}`);
          const connsRef = ref(this.db, `status/${uid}/connections`);
          const infoRef = ref(this.db, '.info/connected');

          onValue(infoRef, (snap) => {
            if (!snap.val()) {
              update(statusRef, {
                state: 'offline',
                last_changed: serverTimestamp(),
              });
              return;
            }

            const connRef = push(connsRef);
            set(connRef, true);

            onDisconnect(connRef).remove();
            onDisconnect(statusRef).update({
              state: 'offline',
              last_changed: serverTimestamp(),
            });

            update(statusRef, {
              state: 'online',
              last_changed: serverTimestamp(),
            });
          });

          return new Observable<null>();
        })
      )
      .subscribe();
  }

  /**
   * Manually forces a user to offline status.
   * Useful for administrative or fallback operations.
   *
   * @param uid UID of the user to mark offline
   * @returns Promise that resolves when the update is complete
   */
  async forceOffline(uid: string) {
    const statusRef = ref(this.db, `status/${uid}`);
    return update(statusRef, {
      state: 'offline',
      last_changed: serverTimestamp(),
    });
  }

  /**
   * Observes real-time presence status of a specific user.
   *
   * @param uid UID of the user to observe
   * @returns Observable that emits the user's current presence record
   */
  getUserStatus(uid: string): Observable<PresenceRecord> {
    const statusRef = ref(this.db, `status/${uid}`);
    return new Observable((observer) => {
      const off = onValue(statusRef, (snap) => {
        const val = snap.val() as PresenceRecord | null;
        observer.next(val ?? { state: 'offline', last_changed: 0 });
      });
      return () => off();
    });
  }
}
