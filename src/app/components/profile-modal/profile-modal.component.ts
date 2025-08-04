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
  private presenceSub?: Subscription;

  isMobile = false;

  constructor(
    private presence: PresenceService,
    private mobileService: MobileService
  ) {}

  /**
   * Reacts to changes in `profileUser` or `show` inputs.
   * Subscribes to presence updates if modal is shown.
   * @param changes Detected input property changes.
   */
  ngOnChanges(changes: SimpleChanges) {
    const showChanged = changes['show'];
    const userChanged = changes['profileUser'];

    if ((showChanged && this.show) || (userChanged && this.show)) {
      this.subscribePresence();
    }

    if (showChanged && !this.show) {
      this.unsubscribePresence();
    }
  }

  /**
   * Initializes mobile detection logic on component load.
   */
  ngOnInit(): void {
    this.mobileService.isMobile$.subscribe((isMobile) => {
      this.isMobile = isMobile;
    });
  }

  /**
   * Subscribes to the presence updates of the profile user.
   */
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
   * Cleans up the presence subscription when the component is destroyed.
   */
  ngOnDestroy() {
    this.unsubscribePresence();
  }
}
