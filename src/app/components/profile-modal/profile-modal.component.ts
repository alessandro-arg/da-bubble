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
import { PresenceService, PresenceRecord } from '../../presence.service';
import { User } from '../../models/user.model';
import { CommonModule } from '@angular/common';
import { MobileService } from '../../mobile.service';

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

  ngOnInit(): void {
    this.mobileService.isMobile$.subscribe((isMobile) => {
      this.isMobile = isMobile;
    });
  }

  private subscribePresence() {
    this.unsubscribePresence();
    if (!this.profileUser?.uid) return;
    this.presenceSub = this.presence
      .getUserStatus(this.profileUser.uid)
      .subscribe((rec: PresenceRecord) => {
        this.profileUserOnline = rec.state === 'online';
      });
  }

  private unsubscribePresence() {
    this.presenceSub?.unsubscribe();
    this.presenceSub = undefined;
  }

  onClose() {
    this.close.emit();
  }

  onMessageClick() {
    this.message.emit();
  }

  ngOnDestroy() {
    this.unsubscribePresence();
  }
}
