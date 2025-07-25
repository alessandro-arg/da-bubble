import { Injectable } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Message } from './models/chat.model';
import { User } from './models/user.model';
import { Group } from './models/group.model';

@Injectable({
  providedIn: 'root',
})
export class MessageUtilsService {
  constructor(private sanitizer: DomSanitizer) {}

  private esc(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Given the raw text and arrays of users/groups, return all mentioned IDs
   */
  extractMentionIds(
    text: string,
    allUsers: User[],
    allGroups: Group[]
  ): string[] {
    const ids = new Set<string>();
    allUsers.forEach((u) => {
      const token = '@' + u.name;
      if (text.includes(token) && u.uid) ids.add(u.uid);
    });
    allGroups.forEach((g) => {
      const token = '#' + g.name;
      if (text.includes(token) && g.id) ids.add(g.id);
    });
    return Array.from(ids);
  }

  /**
   * Turn a Message object into sanitized HTML, wrapping @user and #group tokens
   */
  formatMessageHtml(
    msg: Message,
    allUsersMap: Record<string, User>,
    allGroupsMap: Record<string, Group>,
    participantsMap: Record<string, User>
  ): SafeHtml {
    let raw = msg.text;
    (msg.mentions || []).forEach((id) => {
      if (allUsersMap[id]) {
        const u = allUsersMap[id]!;
        const token = '@' + u.name;
        raw = raw.replace(
          new RegExp(this.esc(token), 'g'),
          `<span 
             class="mention mention-user cursor-pointer font-bold hover:text-[#444DF2] transition-colors duration-100" 
             data-type="user" 
             data-id="${id}"
           >${token}</span>`
        );
      } else if (allGroupsMap[id]) {
        const g = allGroupsMap[id]!;
        const token = '#' + g.name;
        raw = raw.replace(
          new RegExp(this.esc(token), 'g'),
          `<span 
             class="mention mention-group cursor-pointer font-bold hover:text-[#444DF2] transition-colors duration-100" 
             data-type="group" 
             data-id="${id}"
           >${token}</span>`
        );
      }
    });
    return this.sanitizer.bypassSecurityTrustHtml(raw);
  }
}
