/**
 * Component responsible for rendering a single private message bubble,
 * including user info, message formatting, reactions, and hover actions.
 */

import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Message } from '../../models/chat.model';
import { User } from '../../models/user.model';
import { ReactionBarComponent } from '../reaction-bar/reaction-bar.component';
import { HoverMenuComponent } from '../hover-menu/hover-menu.component';
import { MobileService } from '../../services/mobile.service';

@Component({
  selector: 'app-private-message-bubble',
  standalone: true,
  imports: [CommonModule, ReactionBarComponent, HoverMenuComponent],
  templateUrl: './private-message-bubble.component.html',
  styleUrl: './private-message-bubble.component.scss',
})
export class PrivateMessageBubbleComponent {
  @Input() msg!: Message;
  @Input() currentUserUid!: string | null;
  @Input() participantsMap!: Record<string, User>;
  @Input() chatId!: string | null;
  @Input() formatMessageHtml!: (msg: Message) => any;

  @Output() bubbleClick = new EventEmitter<MouseEvent>();
  @Output() quickReaction = new EventEmitter<{ msg: Message; emoji: string }>();
  @Output() toggleOptions = new EventEmitter<{
    msgId: string;
    event: MouseEvent;
  }>();
  @Output() openEdit = new EventEmitter<{ msg: Message; event: MouseEvent }>();

  @ViewChild('bar') bar!: ElementRef;

  isMobile = false;

  constructor(private mobileService: MobileService) {}

  /**
   * Initializes the component and subscribes to the mobile device state.
   */
  ngOnInit(): void {
    this.mobileService.isMobile$.subscribe((isMobile) => {
      this.isMobile = isMobile;
    });
  }
}
