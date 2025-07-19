import { Injectable } from '@angular/core';
import {
  Database,
  ref,
  onValue,
  onDisconnect,
  serverTimestamp,
  update,
} from '@angular/fire/database';
import { Auth, authState } from '@angular/fire/auth';
import { Observable } from 'rxjs';
import { filter, switchMap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class PresenceService {
  constructor(private db: Database, private auth: Auth) {
    authState(this.auth)
      .pipe(
        filter((user) => !!user),
        switchMap((user) => {
          const statusRef = ref(this.db, `status/${user!.uid}`);
          const infoRef = ref(this.db, '.info/connected');

          onValue(infoRef, (snap) => {
            if (!snap.val()) {
              // → offline immediately
              update(statusRef, {
                state: 'offline',
                last_changed: serverTimestamp(),
              });
              return;
            }

            // → schedule offline on disconnect…
            onDisconnect(statusRef)
              .update({
                state: 'offline',
                last_changed: serverTimestamp(),
              })
              .then(() => {
                // …then go online now
                update(statusRef, {
                  state: 'online',
                  last_changed: serverTimestamp(),
                });
              });
          });

          // keep the stream alive
          return new Observable<null>();
        })
      )
      .subscribe();
  }

  getUserStatus(uid: string): Observable<{ state: string }> {
    const statusRef = ref(this.db, `status/${uid}`);
    return new Observable((observer) => {
      const off = onValue(statusRef, (snap) => {
        observer.next(snap.val() ?? { state: 'offline' });
      });
      return () => off();
    });
  }
}
