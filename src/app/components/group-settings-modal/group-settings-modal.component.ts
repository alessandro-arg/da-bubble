import {
  Component,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GroupService } from '../../group.service';
import { Group } from '../../models/group.model';

@Component({
  selector: 'app-group-settings-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './group-settings-modal.component.html',
  styleUrl: './group-settings-modal.component.scss',
})
export class GroupSettingsModalComponent {
  @Input() group!: Group;
  @Input() participantsMap!: Record<string, { name: string }>;
  @Input() isCreator = false;
  @Input() currentUserUid!: string;

  @Output() close = new EventEmitter<void>();
  @Output() closedChannel = new EventEmitter<void>();

  editingGroupName = false;
  editingGroupDescription = false;
  newGroupName = '';
  newGroupDescription = '';

  @ViewChild('groupNameInput') groupNameInput!: ElementRef<HTMLInputElement>;

  constructor(private groupService: GroupService) {}

  ngOnInit() {
    this.newGroupName = this.group.name;
    this.newGroupDescription = this.group.description || '';
  }

  onClose() {
    this.editingGroupName = this.editingGroupDescription = false;
    this.close.emit();
  }

  startEditGroupName() {
    this.editingGroupName = true;
    this.newGroupName = this.group.name;
    setTimeout(() => {
      this.groupNameInput?.nativeElement.focus();
    }, 0);
  }

  cancelEditGroupName() {
    this.editingGroupName = false;
    this.newGroupName = this.group.name;
  }

  async saveGroupName() {
    await this.groupService.updateGroup(this.group.id, {
      name: this.newGroupName,
    });
    this.editingGroupName = false;
  }

  startEditGroupDescription() {
    this.editingGroupDescription = true;
    this.newGroupDescription = this.group.description || '';
  }

  cancelEditGroupDescription() {
    this.editingGroupDescription = false;
    this.newGroupDescription = this.group.description || '';
  }

  async saveGroupDescription() {
    await this.groupService.updateGroup(this.group.id, {
      description: this.newGroupDescription,
    });
    this.editingGroupDescription = false;
  }

  async leaveChannel() {
    await this.groupService.removeUserFromGroup(
      this.group.id,
      this.currentUserUid
    );
    this.onClose();
    this.closedChannel.emit();
  }
}
