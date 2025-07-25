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

@Component({
  selector: 'app-group-message-bubble',
  standalone: true,
  imports: [CommonModule, ReactionBarComponent, HoverMenuComponent],
  templateUrl: './group-message-bubble.component.html',
  styleUrl: './group-message-bubble.component.scss',
})
export class GroupMessageBubbleComponent {
  @Input() msg!: Message;
  @Input() currentUserUid!: string | null;
  @Input() participantsMap!: Record<string, User>;
  @Input() groupId!: string | null;
  @Input() threadStreams!: Record<string, import('rxjs').Observable<Message[]>>;

  /** Bubble clicked (for mentions) */
  @Output() bubbleClick = new EventEmitter<MouseEvent>();
  /** Quick reaction (emoji) */
  @Output() quickReaction = new EventEmitter<{ msg: Message; emoji: string }>();
  /** Toggle options menu */
  @Output() toggleOptions = new EventEmitter<{
    msgId: string;
    event: MouseEvent;
  }>();
  /** Edit requested */
  @Output() openEdit = new EventEmitter<{ msg: Message; event: MouseEvent }>();
  /** Open thread view */
  @Output() openThread = new EventEmitter<Message>();
  /** Click on author name */
  @Output() memberClicked = new EventEmitter<User>();

  @Input() formatMessageHtml!: (msg: Message) => any;

  @ViewChild('bar') bar!: ElementRef;

  /** Helper to get the author User object */
  get author(): User {
    return this.participantsMap[this.msg.sender]!;
  }
}
