import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../chat.service';
import { Observable } from 'rxjs';
import { Message } from '../../models/chat.model';

@Component({
  selector: 'app-thread',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './thread.component.html',
  styleUrl: './thread.component.scss',
})
export class ThreadComponent implements OnChanges {
  @Input() groupId!: string | null;
  @Input() messageId!: string | null;
  @Input() currentUserUid!: string | null;

  originalMessage$?: Observable<Message>;
  threadMessages$?: Observable<Message[]>;
  threadText = '';

  constructor(private chatService: ChatService) {}

  ngOnChanges(changes: SimpleChanges) {
    if (this.groupId && this.messageId) {
      this.originalMessage$ = this.chatService.getGroupMessage(
        this.groupId,
        this.messageId
      );
      this.threadMessages$ = this.chatService.getGroupThreadMessages(
        this.groupId,
        this.messageId
      );
    } else {
      this.originalMessage$ = undefined;
      this.threadMessages$ = undefined;
    }
  }

  async sendThread() {
    if (
      !this.groupId ||
      !this.messageId ||
      !this.currentUserUid ||
      !this.threadText.trim()
    ) {
      return;
    }
    await this.chatService.sendGroupThreadMessage(
      this.groupId,
      this.messageId,
      this.currentUserUid,
      this.threadText.trim()
    );
    this.threadText = '';
  }
}
