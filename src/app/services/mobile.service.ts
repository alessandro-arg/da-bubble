/**
 * MobileService provides a reactive way to detect if the current viewport
 * matches a mobile device (handset) breakpoint using Angular CDK's BreakpointObserver.
 *
 * It exposes an observable (`isMobile$`) that emits `true` when the screen
 * size matches mobile dimensions, and `false` otherwise.
 */

import { Injectable } from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { map, shareReplay } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class MobileService {
  public isMobile$: Observable<boolean>;

  /**
   * Initializes the MobileService and sets up the `isMobile$` observable
   * to monitor screen size changes against the handset breakpoint.
   *
   * @param breakpointObserver Angular CDK BreakpointObserver instance
   */
  constructor(private breakpointObserver: BreakpointObserver) {
    this.isMobile$ = this.breakpointObserver
      .observe([Breakpoints.Handset])
      .pipe(
        map((result) => result.matches),
        shareReplay(1)
      );
  }
}
