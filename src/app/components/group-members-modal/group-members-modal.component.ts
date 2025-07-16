import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Group } from '../../models/group.model';

@Component({
  selector: 'app-group-members-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './group-members-modal.component.html',
  styleUrl: './group-members-modal.component.scss',
})
export class GroupMembersModalComponent {
  @Input() group!: Group;
  @Input() participantsMap!: Record<string, { avatar: string; name: string }>;
  @Input() currentUserUid!: string;
  @Output() close = new EventEmitter<void>();
  @Output() addMembers = new EventEmitter<void>();
  @Output() memberClicked = new EventEmitter<any>();

  showProfileModal: boolean = false;
  chatPartner: any = null;

  isButtonHovered = false;

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
