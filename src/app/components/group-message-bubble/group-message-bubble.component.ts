import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Message } from '../../models/chat.model';
import { User } from '../../models/user.model';
import { ReactionBarComponent } from '../reaction-bar/reaction-bar.component';
import { HoverMenuComponent } from '../hover-menu/hover-menu.component';
import { MobileService } from '../../mobile.service';

@Component({
  selector: 'app-group-message-bubble',
  standalone: true,
  imports: [CommonModule, ReactionBarComponent, HoverMenuComponent],
  templateUrl: './group-message-bubble.component.html',
  styleUrl: './group-message-bubble.component.scss',
})
export class GroupMessageBubbleComponent implements OnInit {
  @Input() msg!: Message;
  @Input() currentUserUid!: string | null;
  @Input() participantsMap!: Record<string, User>;
  @Input() groupId!: string | null;
  @Input() threadStreams!: Record<string, import('rxjs').Observable<Message[]>>;

  @Output() bubbleClick = new EventEmitter<MouseEvent>();
  @Output() quickReaction = new EventEmitter<{ msg: Message; emoji: string }>();
  @Output() toggleOptions = new EventEmitter<{
    msgId: string;
    event: MouseEvent;
  }>();
  @Output() openEdit = new EventEmitter<{ msg: Message; event: MouseEvent }>();
  @Output() openThread = new EventEmitter<Message>();
  @Output() memberClicked = new EventEmitter<User>();

  @Input() formatMessageHtml!: (msg: Message) => any;

  @ViewChild('bar') bar!: ElementRef;

  isMobile = false;

  constructor(private mobileService: MobileService) {}

  ngOnInit(): void {
    this.mobileService.isMobile$.subscribe((isMobile) => {
      this.isMobile = isMobile;
    });
  }

  get author(): User {
    return this.participantsMap[this.msg.sender]!;
  }
}
