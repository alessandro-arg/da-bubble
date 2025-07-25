import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Group } from '../../models/group.model';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-group-chat-empty',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './group-chat-empty.component.html',
  styleUrl: './group-chat-empty.component.scss',
})
export class GroupChatEmptyComponent {
  @Input() group!: Group;
  @Input() participantsMap: Record<string, User> = {};

  @Output() openSettings = new EventEmitter<void>();
}
