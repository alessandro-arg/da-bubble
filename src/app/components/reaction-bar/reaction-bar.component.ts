/**
 * Component for displaying and interacting with emoji reactions on a message.
 * Supports adding/removing reactions in private chats, group chats, and threads.
 */

import {
  Component,
  Input,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  HostListener,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatService } from '../../services/chat.service';
import { Message, Reaction } from '../../models/chat.model';
import { User } from '../../models/user.model';
import { FormsModule } from '@angular/forms';
import { MobileService } from '../../services/mobile.service';

@Component({
  selector: 'app-reaction-bar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './reaction-bar.component.html',
  styleUrls: ['./reaction-bar.component.scss'],
})
export class ReactionBarComponent implements OnInit {
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
  isMobile = false;

  constructor(
    private chatService: ChatService,
    private mobileService: MobileService,
    private host: ElementRef<HTMLElement>
  ) {}

  ngOnInit() {
    this.mobileService.isMobile$.subscribe((isMobile) => {
      this.isMobile = isMobile;
    });
  }

  /**
   * Detects and handles clicks outside of the component to hide the emoji picker.
   * @param targetElement The clicked element.
   */
  @HostListener('document:click', ['$event.target'])
  onClickOutside(targetElement: HTMLElement) {
    if (!this.showPicker) return;
    if (this.host.nativeElement.contains(targetElement)) return;
    if ((targetElement as Element).closest('.picker-container')) return;
    this.showPicker = false;
  }

  /**
   * Toggles visibility of the emoji picker.
   */
  togglePicker() {
    this.showPicker = !this.showPicker;
  }

  /**
   * Toggles the expanded state of the reactions display.
   */
  toggleReactions() {
    this.expanded = !this.expanded;
  }

  /**
   * Checks if the reactions list is expanded.
   */
  isExpanded() {
    return this.expanded;
  }

  /**
   * Computes the number of additional reactions beyond `maxVisible`.
   */
  extraCount() {
    const total = this.summarizeReactions(this.msg.reactions).length;
    return total > this.maxVisible ? total - this.maxVisible : 0;
  }

  /**
   * Returns the set of reactions to display based on expansion state.
   */
  displayedReactions() {
    const all = this.summarizeReactions(this.msg.reactions);
    return this.expanded ? all : all.slice(0, this.maxVisible);
  }

  /**
   * Summarizes a list of reactions into unique emojis with total counts.
   * @param reactions List of individual user reactions.
   */
  summarizeReactions(
    reactions: Reaction[] = []
  ): { emoji: string; count: number }[] {
    const counter: Record<string, number> = {};
    reactions.forEach((r) => (counter[r.emoji] = (counter[r.emoji] || 0) + 1));
    return Object.entries(counter).map(([emoji, count]) => ({ emoji, count }));
  }

  /**
   * Handles the logic of toggling a reaction (add or remove) for the current user.
   * @param emoji The selected emoji.
   */
  async onReactionClick(emoji: string) {
    if (!this.msg.id || !this.currentUserUid) return;

    const isGroup = !!this.groupId && !this.parentMessageId;
    const isThread = !!this.groupId && !!this.parentMessageId;
    const isPrivate = !this.groupId;
    const targetId = isGroup ? this.groupId! : this.chatId!;
    const parentId = this.parentMessageId!;
    const alreadyReacted = this.hasUserReacted(emoji);

    if (alreadyReacted) {
      await this.removeReaction(emoji, isThread, isGroup, targetId, parentId);
    } else {
      await this.addReaction(emoji, isThread, isGroup, targetId, parentId);
    }
  }

  /**
   * Checks if the current user has already reacted with a specific emoji.
   */
  private hasUserReacted(emoji: string): boolean {
    return (this.msg.reactions ?? []).some(
      (r) => r.userId === this.currentUserUid && r.emoji === emoji
    );
  }

  /**
   * Handles removing a reaction for thread, group, or private messages.
   */
  private async removeReaction(
    emoji: string,
    isThread: boolean,
    isGroup: boolean,
    targetId: string,
    parentId: string
  ) {
    if (isThread) {
      await this.chatService.removeThreadReaction(
        this.groupId!,
        parentId,
        this.msg.id!,
        emoji,
        this.currentUserUid!
      );
    } else {
      await this.chatService.removeReaction(
        targetId,
        this.msg.id!,
        emoji,
        this.currentUserUid!,
        isGroup
      );
    }
  }

  /**
   * Handles adding a reaction for thread, group, or private messages.
   */
  private async addReaction(
    emoji: string,
    isThread: boolean,
    isGroup: boolean,
    targetId: string,
    parentId: string
  ) {
    const reaction: Reaction = {
      emoji,
      userId: this.currentUserUid!,
      createdAt: new Date(),
    };

    if (isThread) {
      await this.chatService.addThreadReaction(
        this.groupId!,
        parentId,
        this.msg.id!,
        reaction
      );
    } else {
      await this.chatService.addReaction(
        targetId,
        this.msg.id!,
        reaction,
        isGroup
      );
    }
  }

  /**
   * Gets the names of users who reacted with a given emoji.
   * @param emoji The emoji to look up.
   * @returns List of usernames (or "Du" for current user).
   */
  getReactionUserNames(emoji: string): string[] {
    return (this.msg.reactions ?? [])
      .filter((r) => r.emoji === emoji)
      .map((r) =>
        r.userId === this.currentUserUid
          ? 'Du'
          : this.participantsMap[r.userId]?.name || 'Unknown'
      );
  }
}
