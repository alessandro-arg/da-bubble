/**
 * MessageUtilsService provides utility functions for handling mentions
 * in chat messages. It supports extracting mentioned user/group IDs
 * and formatting mentions into interactive, sanitized HTML.
 */

import { Injectable } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Message } from './../models/chat.model';
import { User } from './../models/user.model';
import { Group } from './../models/group.model';

@Injectable({
  providedIn: 'root',
})
export class MessageUtilsService {
  constructor(private sanitizer: DomSanitizer) {}

  /**
   * Escapes special characters in a string for use in RegExp.
   *
   * @param str The input string to escape
   * @returns The escaped string
   */
  private esc(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Extracts all user and group IDs that are mentioned in a message text.
   * A mention is defined as `@username` or `#groupname`.
   *
   * @param text The raw message text
   * @param allUsers List of all known users
   * @param allGroups List of all known groups
   * @returns Array of mentioned user and group IDs
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
   * Converts a message object into sanitized HTML, wrapping mentioned
   * usernames and group names with interactive span elements.
   *
   * The span elements have `data-type` and `data-id` attributes for
   * identifying the entity and enabling clickable interactions.
   *
   * @param msg The message object to format
   * @param allUsersMap A map of userId → User
   * @param allGroupsMap A map of groupId → Group
   * @param participantsMap A map of userId → User (used to resolve participant names)
   * @returns Sanitized HTML content with styled and interactive mentions
   */
  formatMessageHtml(
    msg: Message,
    allUsersMap: Record<string, User>,
    allGroupsMap: Record<string, Group>,
    participantsMap: Record<string, User>
  ): SafeHtml {
    let raw = msg.text;

    (msg.mentions || []).forEach((id) => {
      const user = allUsersMap[id];
      const group = allGroupsMap[id];
      const entity = user
        ? { token: '@' + user.name, type: 'user', name: user.name }
        : group
        ? { token: '#' + group.name, type: 'group', name: group.name }
        : null;

      if (entity) {
        const { token, type } = entity;
        const span = `<span 
        class="mention mention-${type} cursor-pointer font-bold hover:text-[#444DF2] transition-colors duration-100" 
        data-type="${type}" 
        data-id="${id}"
      >${token}</span>`;
        raw = raw.replace(new RegExp(this.esc(token), 'g'), span);
      }
    });

    return this.sanitizer.bypassSecurityTrustHtml(raw);
  }
}
