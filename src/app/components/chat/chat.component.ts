import {
  AfterViewChecked,
  Component,
  ElementRef,
  ViewChild,
  Input,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../chat.service';
import { UserService } from '../../user.service';
import { Message } from '../../models/chat.model';
import { User } from '../../models/user.model';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss',
})
export class ChatComponent implements AfterViewChecked, OnChanges {
  @Input() chatPartner!: User | null;
  @Input() currentUserUid!: string | null;

  messages$!: Observable<Message[]>;
  chatId: string | null = null;
  newMessage = '';

  participantsMap: Record<string, User> = {};

  @ViewChild('chatContainer')
  private chatContainer!: ElementRef<HTMLDivElement>;
  private hasScrolledInitially = false;

  constructor(
    private chatService: ChatService,
    private userService: UserService
  ) {}

  async ngOnChanges(changes: SimpleChanges) {
    if (changes['chatPartner'] && this.chatPartner && this.currentUserUid) {
      this.chatId = await this.chatService.ensureChat(
        this.currentUserUid,
        this.chatPartner.uid
      );
      this.messages$ = this.chatService.getChatMessages(this.chatId);

      const me = await this.userService.getUser(this.currentUserUid);
      if (me) {
        this.participantsMap = {
          [me.uid!]: me,
          [this.chatPartner.uid]: this.chatPartner,
        };
      }
    }
  }

  ngAfterViewChecked() {
    if (!this.hasScrolledInitially) {
      this.scrollToBottom();
      this.hasScrolledInitially = true;
    }
  }

  async send() {
    if (!this.chatId || !this.newMessage.trim() || !this.currentUserUid) return;
    await this.chatService.sendMessage(
      this.chatId,
      this.currentUserUid,
      this.newMessage.trim()
    );
    this.newMessage = '';
  }

  scrollToBottom() {
    const el = this.chatContainer?.nativeElement;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }
}
