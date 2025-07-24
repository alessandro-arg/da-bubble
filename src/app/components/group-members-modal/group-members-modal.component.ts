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
import { PresenceService, PresenceRecord } from '../../presence.service';

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

  statusMap: Record<string, boolean> = {};
  private subs: Subscription[] = [];

  showProfileModal: boolean = false;
  chatPartner: any = null;

  isButtonHovered = false;

  constructor(private presence: PresenceService) {}

  ngOnInit() {
    for (const uid of this.group.participants || []) {
      const sub = this.presence
        .getUserStatus(uid)
        .subscribe((rec: PresenceRecord) => {
          this.statusMap[uid] = rec.state === 'online';
        });
      this.subs.push(sub);
    }
  }

  ngOnDestroy() {
    this.subs.forEach((s) => s.unsubscribe());
  }

  onClose() {
    this.close.emit();
  }

  onAddMembers() {
    this.addMembers.emit();
  }

  openProfileModal(user: any) {
    this.memberClicked.emit(user);
  }

  closeProfileModal() {
    this.showProfileModal = false;
    this.chatPartner = null;
  }
}
