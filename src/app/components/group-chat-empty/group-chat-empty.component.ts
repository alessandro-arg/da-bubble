/**
 * Displays an empty state for a group chat when no messages have been sent yet.
 * It optionally shows a button to open group settings (if the current user is the creator).
 */

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Group } from '../../models/group.model';
import { User } from '../../models/user.model';
import { MobileService } from '../../services/mobile.service';

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

  isMobile = false;

  constructor(private mobileService: MobileService) {}

  /**
   * Subscribes to mobile screen size changes to update the layout conditionally.
   */
  ngOnInit(): void {
    this.mobileService.isMobile$.subscribe((isMobile) => {
      this.isMobile = isMobile;
    });
  }
}
