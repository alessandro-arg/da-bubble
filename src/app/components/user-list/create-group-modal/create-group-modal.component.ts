import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GroupService } from '../../../group.service';

@Component({
  selector: 'app-create-group-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-group-modal.component.html',
  styleUrl: './create-group-modal.component.scss',
})
export class CreateGroupModalComponent {
  @Output() close = new EventEmitter<void>();
  @Output() created = new EventEmitter<string>();

  name = '';
  description = '';
  step = 1;
  addAll = true;
  specificPeople = '';

  constructor(private groupService: GroupService) {}

  stopPropagation(event: MouseEvent) {
    event.stopPropagation();
  }

  onClose() {
    this.reset();
    this.step = 1;
    this.close.emit();
  }

  onCreate() {
    if (!this.name.trim()) {
      return;
    }
    this.step = 2;
  }

  backToStep1() {
    this.step = 1;
  }

  async onFinish() {
    let groupId: string;
    if (this.addAll) {
      groupId = await this.groupService.createGroupWithAllUsers(
        this.name,
        this.description
      );
    } else {
      const participants = this.specificPeople
        .split(/[\s,;]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      groupId = await this.groupService.createGroup(
        this.name,
        this.description,
        participants
      );
    }

    this.created.emit(groupId); // <-- now matches EventEmitter<string>
    this.onClose();
  }

  private reset() {
    this.name = '';
    this.description = '';
    this.addAll = true;
    this.specificPeople = '';
  }
}
