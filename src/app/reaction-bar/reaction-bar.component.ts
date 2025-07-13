import {
  Component,
  Input,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatService } from '../chat.service';
import { Message, Reaction } from '../models/chat.model';
import { User } from '../models/user.model';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-reaction-bar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './reaction-bar.component.html',
  styleUrls: ['./reaction-bar.component.scss'],
})
export class ReactionBarComponent {
  @Input() msg!: Message;
  @Input() currentUserUid!: string | null;
  @Input() participantsMap!: Record<string, User>;
  @Input() groupId?: string | null;
  @Input() chatId?: string | null;
  @Input() parentMessageId?: string | null;
  @Input() maxVisible = 5;
  @Input() inThread = false;

  showPicker = false;
  expanded = false;

  constructor(
    private chatService: ChatService,
    private host: ElementRef<HTMLElement>
  ) {}

  @HostListener('document:click', ['$event.target'])
  onClickOutside(targetElement: HTMLElement) {
    if (!this.showPicker) return;
    if (this.host.nativeElement.contains(targetElement)) return;
    if ((targetElement as Element).closest('.picker-container')) return;
    this.showPicker = false;
  }

  togglePicker() {
    this.showPicker = !this.showPicker;
  }

  toggleReactions() {
    this.expanded = !this.expanded;
  }

  isExpanded() {
    return this.expanded;
  }

  extraCount() {
    const total = this.summarizeReactions(this.msg.reactions).length;
    return total > this.maxVisible ? total - this.maxVisible : 0;
  }

  displayedReactions() {
    const all = this.summarizeReactions(this.msg.reactions);
    return this.expanded ? all : all.slice(0, this.maxVisible);
  }

  summarizeReactions(
    reactions: Reaction[] = []
  ): { emoji: string; count: number }[] {
    const counter: Record<string, number> = {};
    reactions.forEach((r) => (counter[r.emoji] = (counter[r.emoji] || 0) + 1));
    return Object.entries(counter).map(([emoji, count]) => ({ emoji, count }));
  }

  async onReactionClick(emoji: string) {
    if (!this.msg.id || !this.currentUserUid) return;

    const isGroup = !!this.groupId && !this.parentMessageId;
    const isThread = !!this.groupId && !!this.parentMessageId;
    const targetId = isGroup ? this.groupId! : this.chatId!;
    const parentId = this.parentMessageId!;

    const already = (this.msg.reactions ?? []).some(
      (r) => r.userId === this.currentUserUid && r.emoji === emoji
    );

    if (already) {
      if (isThread) {
        await this.chatService.removeThreadReaction(
          this.groupId!,
          parentId,
          this.msg.id,
          emoji,
          this.currentUserUid
        );
      } else {
        await this.chatService.removeReaction(
          targetId,
          this.msg.id,
          emoji,
          this.currentUserUid,
          isGroup
        );
      }
    } else {
      const reaction: Reaction = {
        emoji,
        userId: this.currentUserUid,
        createdAt: new Date(),
      };

      if (isThread) {
        await this.chatService.addThreadReaction(
          this.groupId!,
          parentId,
          this.msg.id,
          reaction
        );
      } else {
        await this.chatService.addReaction(
          targetId,
          this.msg.id,
          reaction,
          isGroup
        );
      }
    }
  }

  getReactionUserNames(emoji: string): string[] {
    return (this.msg.reactions ?? [])
      .filter((r) => r.emoji === emoji)
      .map((r) =>
        r.userId === this.currentUserUid
          ? 'You'
          : this.participantsMap[r.userId]?.name || 'Unknown'
      );
  }
}
