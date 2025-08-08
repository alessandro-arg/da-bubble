/**
 * Displays a modal showing a user's profile information, including online status,
 * and allows sending a message or closing the modal.
 */

import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { Subscription } from 'rxjs';
import {
  PresenceService,
  PresenceRecord,
} from '../../services/presence.service';
import { User } from '../../models/user.model';
import { CommonModule } from '@angular/common';
import { MobileService } from '../../services/mobile.service';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-profile-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile-modal.component.html',
  styleUrl: './profile-modal.component.scss',
})
export class ProfileModalComponent implements OnChanges, OnDestroy, OnInit {
  @Input() profileUser: User | null = null;
  @Input() show = false;
  @Output() close = new EventEmitter<void>();
  @Output() message = new EventEmitter<void>();

  profileUserOnline = false;
  isMobile = false;

  participantsMap: Record<string, User> = {};
  private subs = new Subscription();

  constructor(
    private presence: PresenceService,
    private mobileService: MobileService,
    private userService: UserService
  ) {}

  /**
   * Initializes mobile detection logic on component load.
   */
  ngOnInit(): void {
    this.mobileService.isMobile$.subscribe((isMobile) => {
      this.isMobile = isMobile;
    });

    this.subs.add(
      this.userService.getAllUsersLive().subscribe((users) => {
        this.participantsMap = Object.fromEntries(
          users.map((u) => [u.uid!, u])
        );
      })
    );
  }

  /**
   * Reacts to changes in `profileUser` or `show` inputs.
   * Subscribes to presence updates if modal is shown.
   * @param changes Detected input property changes.
   */
  ngOnChanges(changes: SimpleChanges) {
    if (this.show && this.profileUser?.uid) {
      this.subscribePresence();
    }
    if (changes['show'] && !this.show) {
      this.unsubscribePresence();
    }
  }

  /**
   * Subscribes to the presence updates of the profile user.
   */
  private presenceSub?: Subscription;
  private subscribePresence() {
    this.unsubscribePresence();
    if (!this.profileUser?.uid) return;
    this.presenceSub = this.presence
      .getUserStatus(this.profileUser.uid)
      .subscribe((rec: PresenceRecord) => {
        this.profileUserOnline = rec.state === 'online';
      });
  }

  /**
   * Unsubscribes from any existing presence subscriptions.
   */
  private unsubscribePresence() {
    this.presenceSub?.unsubscribe();
    this.presenceSub = undefined;
  }

  /**
   * Cleans up the presence subscription when the component is destroyed.
   */
  ngOnDestroy() {
    this.unsubscribePresence();
    this.subs.unsubscribe();
  }

  /**
   * Emits the close event when the modal is closed.
   */
  onClose() {
    this.close.emit();
  }

  /**
   * Emits the message event when the message button is clicked.
   */
  onMessageClick() {
    this.message.emit();
  }

  /**
   * Helper to always pull the 'live' user object if available.
   *  */
  get liveProfile(): User | null {
    if (!this.profileUser?.uid) return null;
    return this.participantsMap[this.profileUser.uid] || this.profileUser;
  }
}
