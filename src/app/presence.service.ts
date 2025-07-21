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

export interface PresenceRecord {
  state: 'online' | 'offline';
  last_changed: number;
}

@Injectable({ providedIn: 'root' })
export class PresenceService {
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
              // lost all connectivity → mark offline immediately
              update(statusRef, {
                state: 'offline',
                last_changed: serverTimestamp(),
              });
              return;
            }

            // we’re back online: create a new connection entry
            const connRef = push(connsRef);
            set(connRef, true);

            // schedule *both* removal of this connection _and_
            // marking the parent status `offline` on disconnect
            onDisconnect(connRef).remove();
            onDisconnect(statusRef).update({
              state: 'offline',
              last_changed: serverTimestamp(),
            });

            // now that scheduling is done, flip us to online
            update(statusRef, {
              state: 'online',
              last_changed: serverTimestamp(),
            });
          });

          // We don’t need a second listener on `connsRef` anymore,
          // because we flip `online`/`offline` directly above.

          // keep the outer stream alive
          return new Observable<null>();
        })
      )
      .subscribe();
  }

  async forceOffline(uid: string) {
    const statusRef = ref(this.db, `status/${uid}`);
    return update(statusRef, {
      state: 'offline',
      last_changed: serverTimestamp(),
    });
  }

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
