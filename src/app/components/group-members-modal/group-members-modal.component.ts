/**
 * A modal component that displays the list of members in a group chat.
 * Shows online/offline status, allows opening member profiles, and emits events
 * for closing the modal or adding new members.
 */

import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Group } from '../../models/group.model';
import { Subscription } from 'rxjs';
import {
  PresenceService,
  PresenceRecord,
} from '../../services/presence.service';
import { MobileService } from '../../services/mobile.service';

@Component({
  selector: 'app-group-members-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './group-members-modal.component.html',
  styleUrl: './group-members-modal.component.scss',
})
export class GroupMembersModalComponent implements OnInit, OnDestroy {
  @Input() group!: Group;
  @Input() participantsMap!: Record<string, { avatar: string; name: string }>;
  @Input() currentUserUid!: string | null;

  @Output() close = new EventEmitter<void>();
  @Output() addMembers = new EventEmitter<void>();
  @Output() memberClicked = new EventEmitter<any>();

  @Input() embeddedInSettings = false;

  statusMap: Record<string, boolean> = {};
  private subs: Subscription[] = [];

  showProfileModal: boolean = false;
  chatPartner: any = null;

  isButtonHovered = false;
  isMobile = false;

  constructor(
    private presence: PresenceService,
    private mobileService: MobileService
  ) {}

  /**
   * Initializes mobile layout detection and subscribes to participant presence statuses.
   */
  ngOnInit() {
    this.mobileService.isMobile$.subscribe((isMobile) => {
      this.isMobile = isMobile;
    });

    for (const uid of this.group.participants || []) {
      const sub = this.presence
        .getUserStatus(uid)
        .subscribe((rec: PresenceRecord) => {
          this.statusMap[uid] = rec.state === 'online';
        });
      this.subs.push(sub);
    }
  }

  /**
   * Cleans up all presence subscriptions on component destruction.
   */
  ngOnDestroy() {
    this.subs.forEach((s) => s.unsubscribe());
  }

  /**
   * Emits the close event to close the modal.
   */
  onClose() {
    this.close.emit();
  }

  /**
   * Emits the addMembers event to trigger adding users to the group.
   */
  onAddMembers() {
    this.addMembers.emit();
  }

  /**
   * Emits the memberClicked event when a group member is clicked.
   * @param user The clicked user
   */
  openProfileModal(user: any) {
    this.memberClicked.emit(user);
  }

  /**
   * Closes the profile modal.
   */
  closeProfileModal() {
    this.showProfileModal = false;
    this.chatPartner = null;
  }
}
