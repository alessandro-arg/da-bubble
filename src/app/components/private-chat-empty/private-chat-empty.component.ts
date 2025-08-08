/**
 * Component that displays a placeholder view when a private chat is empty.
 * Useful for showing user info or prompting the user to start a conversation.
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
import { User } from '../../models/user.model';
import { MobileService } from '../../services/mobile.service';
import { Subscription } from 'rxjs';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-private-chat-empty',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './private-chat-empty.component.html',
  styleUrl: './private-chat-empty.component.scss',
})
export class PrivateChatEmptyComponent implements OnInit, OnDestroy {
  @Input() chatPartner!: User;
  @Input() currentUserUid!: string | null;
  @Output() memberClicked = new EventEmitter<User>();

  isMobile = false;
  participantsMap: Record<string, User> = {};
  private subs = new Subscription();

  constructor(
    private mobileService: MobileService,
    private userService: UserService
  ) {}

  /**
   * Initializes the component and subscribes to the mobile state.
   */
  ngOnInit(): void {
    this.subs.add(
      this.userService.getAllUsersLive().subscribe((users) => {
        this.participantsMap = Object.fromEntries(
          users.map((u) => [u.uid!, u])
        );
      })
    );

    this.mobileService.isMobile$.subscribe((isMobile) => {
      this.isMobile = isMobile;
    });
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  /**
   * Called when the user clicks the chat partner avatar or name.
   * Emits the `memberClicked` event with the chat partner.
   */
  onMemberClick() {
    this.memberClicked.emit(this.chatPartner);
  }
}
